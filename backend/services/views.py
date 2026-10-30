from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from django.db.models import Q
from decimal import Decimal
import uuid

from .models import ServiceRequest, ServiceRequestRecipient
from .serializers import (
    ServiceRequestListSerializer,
    ServiceRequestDetailSerializer,
    CreateServiceRequestSerializer,
    RecipientDetailSerializer
)
from fixit_backend.permissions import IsCustomer, IsProfessional
from notifications.models import send_notification, Notification
from wallet.models import Wallet, WalletTransaction

class ServiceRequestListCreateView(generics.ListCreateAPIView):
    """
    List user's service requests (customer views submitted, professional views assigned).
    POST: Customer creates new request targeting up to 3 selected professionals.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateServiceRequestSerializer
        return ServiceRequestListSerializer

    def get_queryset(self):
        user = self.request.user
        status_param = self.request.query_params.get('status')

        if user.is_customer:
            qs = ServiceRequest.objects.filter(customer=user)
        elif user.is_professional:
            qs = ServiceRequest.objects.filter(
                Q(accepted_professional=user) | Q(recipients__professional=user)
            ).distinct()
        elif user.is_staff or user.role == 'ADMIN':
            qs = ServiceRequest.objects.all()
        else:
            qs = ServiceRequest.objects.none()

        if status_param:
            qs = qs.filter(status=status_param.upper())

        return qs.select_related('customer', 'category', 'city', 'subcity', 'accepted_professional').prefetch_related('recipients')

    def create(self, request, *args, **kwargs):
        if not (request.user.is_customer or request.user.is_staff):
            return Response({'detail': 'Only customers can create service requests.'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        service_request = serializer.save()

        detail_serializer = ServiceRequestDetailSerializer(service_request, context={'request': request})
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)


class ServiceRequestDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ServiceRequestDetailSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == 'ADMIN':
            return ServiceRequest.objects.all()
        return ServiceRequest.objects.filter(
            Q(customer=user) | Q(accepted_professional=user) | Q(recipients__professional=user)
        ).distinct()


class ProfessionalInboxView(APIView):
    """
    Dedicated request inbox for skilled workers.
    Returns invites separated into pending invites, active jobs, and past jobs.
    """
    permission_classes = [IsProfessional]

    def get(self, request):
        user = request.user
        filter_status = request.query_params.get('filter', 'pending')

        if filter_status == 'pending':
            # Invitations where this professional is still pending and request is pending
            recipients = ServiceRequestRecipient.objects.filter(
                professional=user,
                status=ServiceRequestRecipient.STATUS_PENDING,
                request__status=ServiceRequest.STATUS_PENDING
            ).select_related('request', 'request__category', 'request__city', 'request__subcity', 'request__customer')
        elif filter_status == 'active':
            # Jobs accepted by this professional that are currently ACCEPTED or IN_PROGRESS
            return Response(
                ServiceRequestListSerializer(
                    ServiceRequest.objects.filter(
                        accepted_professional=user,
                        status__in=[ServiceRequest.STATUS_ACCEPTED, ServiceRequest.STATUS_IN_PROGRESS]
                    ),
                    many=True
                ).data
            )
        elif filter_status == 'completed':
            return Response(
                ServiceRequestListSerializer(
                    ServiceRequest.objects.filter(
                        accepted_professional=user,
                        status=ServiceRequest.STATUS_COMPLETED
                    ),
                    many=True
                ).data
            )
        elif filter_status == 'all':
            recipients = ServiceRequestRecipient.objects.filter(
                professional=user
            ).select_related('request', 'request__category', 'request__city', 'request__subcity')
        else:
            recipients = ServiceRequestRecipient.objects.filter(
                professional=user,
                status=ServiceRequestRecipient.STATUS_PENDING,
                request__status=ServiceRequest.STATUS_PENDING
            ).select_related('request', 'request__category', 'request__city', 'request__subcity')

        results = []
        for r in recipients:
            cust = r.request.customer
            cust_pic = cust.profile_picture_url

            results.append({
                'recipient_id': r.id,
                'recipient_status': r.status,
                'request_id': r.request.id,
                'title': r.request.title,
                'category_name': r.request.category.name,
                'city_name': r.request.city.name,
                'subcity_name': r.request.subcity.name if r.request.subcity else '',
                'description': r.request.description,
                'preferred_date': r.request.preferred_date,
                'created_at': r.request.created_at,
                'request_status': r.request.status,
                'customer_name': cust.get_full_name() or cust.username,
                'customer_picture': cust_pic,
            })

        return Response(results)


class ProfessionalAcceptRequestView(APIView):
    """
    Professional accepts a service request safely with concurrency lock.
    Enforces the mandatory 50 ETB job acceptance fee atomically.
    Reveals customer private contact information and marks other invites superseded.
    """
    permission_classes = [IsProfessional]

    def post(self, request, pk):
        user = request.user
        ACCEPTANCE_FEE = Decimal('50.00')

        with transaction.atomic():
            service_request = get_object_or_404(
                ServiceRequest.objects.select_for_update(),
                pk=pk
            )

            # Check recipient invite
            recipient = ServiceRequestRecipient.objects.filter(
                request=service_request,
                professional=user
            ).first()

            if not recipient:
                return Response({'detail': 'You were not selected for this service request.'}, status=status.HTTP_403_FORBIDDEN)

            if service_request.status != ServiceRequest.STATUS_PENDING:
                if service_request.accepted_professional == user:
                    return Response({'detail': 'You have already accepted this request.'}, status=status.HTTP_200_OK)
                return Response(
                    {'detail': 'This service request is no longer pending or has already been accepted by another professional.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check wallet balance and deduct exactly 50 ETB acceptance fee atomically
            pro_profile = user.professional_profile
            wallet, _ = Wallet.objects.select_for_update().get_or_create(professional=pro_profile)

            already_deducted = WalletTransaction.objects.filter(
                wallet=wallet,
                service_request=service_request,
                transaction_type=WalletTransaction.TYPE_JOB_FEE,
                status=WalletTransaction.STATUS_SUCCESS
            ).exists()

            if not already_deducted:
                if wallet.balance < ACCEPTANCE_FEE:
                    return Response({
                        'error_code': 'INSUFFICIENT_WALLET_BALANCE',
                        'detail': 'Insufficient wallet balance. You need at least 50 ETB in your wallet to accept this job request. The fee is non-refundable upon acceptance.',
                        'required_amount': float(ACCEPTANCE_FEE),
                        'current_balance': float(wallet.balance)
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Deduct fee and record ledger transaction atomically
                wallet.balance -= ACCEPTANCE_FEE
                wallet.save(update_fields=['balance', 'updated_at'])

                WalletTransaction.objects.create(
                    wallet=wallet,
                    transaction_type=WalletTransaction.TYPE_JOB_FEE,
                    amount=-ACCEPTANCE_FEE,
                    balance_after=wallet.balance,
                    status=WalletTransaction.STATUS_SUCCESS,
                    reference=f"FIXIT-FEE-{service_request.id}-{uuid.uuid4().hex[:8].upper()}",
                    service_request=service_request,
                    description=f"Job acceptance fee for #{service_request.id}: {service_request.title}"
                )

            # Assign and transition request
            service_request.accepted_professional = user
            service_request.status = ServiceRequest.STATUS_ACCEPTED
            service_request.accepted_at = timezone.now()
            service_request.save()

            # Update this recipient
            recipient.status = ServiceRequestRecipient.STATUS_ACCEPTED
            recipient.responded_at = timezone.now()
            recipient.save()

            # Mark all other pending recipients as SUPERSEDED
            ServiceRequestRecipient.objects.filter(
                request=service_request,
                status=ServiceRequestRecipient.STATUS_PENDING
            ).exclude(professional=user).update(status=ServiceRequestRecipient.STATUS_SUPERSEDED)

            # Notify the customer
            pro_name = user.get_full_name() or user.username
            send_notification(
                recipient=service_request.customer,
                notification_type=Notification.TYPE_REQUEST_ACCEPTED,
                title="Service Request Accepted!",
                message=f"{pro_name} has accepted your request '{service_request.title}'. You can now arrange the service.",
                resource_type='service_request',
                resource_id=service_request.id
            )

        serializer = ServiceRequestDetailSerializer(service_request, context={'request': request})
        return Response({
            'message': 'Service request accepted successfully. Customer contact details are now revealed.',
            'service_request': serializer.data,
            'wallet_balance': float(wallet.balance),
            'fee_deducted': float(ACCEPTANCE_FEE)
        }, status=status.HTTP_200_OK)


class ProfessionalDeclineRequestView(APIView):
    """
    Professional declines an invite.
    If all selected recipients decline, request status transitions to DECLINED_BY_ALL.
    """
    permission_classes = [IsProfessional]

    def post(self, request, pk):
        user = request.user
        reason = request.data.get('reason', '')

        with transaction.atomic():
            service_request = get_object_or_404(
                ServiceRequest.objects.select_for_update(),
                pk=pk
            )

            recipient = ServiceRequestRecipient.objects.filter(
                request=service_request,
                professional=user
            ).first()

            if not recipient:
                return Response({'detail': 'You were not invited to this request.'}, status=status.HTTP_403_FORBIDDEN)

            recipient.status = ServiceRequestRecipient.STATUS_DECLINED
            recipient.declined_reason = reason
            recipient.responded_at = timezone.now()
            recipient.save()

            # Check if all recipients have declined
            pending_count = ServiceRequestRecipient.objects.filter(
                request=service_request,
                status=ServiceRequestRecipient.STATUS_PENDING
            ).count()

            if pending_count == 0 and service_request.status == ServiceRequest.STATUS_PENDING:
                service_request.status = ServiceRequest.STATUS_DECLINED_BY_ALL
                service_request.save(update_fields=['status'])

                send_notification(
                    recipient=service_request.customer,
                    notification_type=Notification.TYPE_REQUEST_DECLINED,
                    title="Service Request Declined",
                    message=f"The professionals selected for '{service_request.title}' were unable to take your request. You can search and select other professionals.",
                    resource_type='service_request',
                    resource_id=service_request.id
                )

        return Response({'message': 'You have declined the request.'}, status=status.HTTP_200_OK)


class UpdateJobProgressView(APIView):
    """
    Mark job as IN_PROGRESS. Only authorized accepted professional or customer.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        service_request = get_object_or_404(ServiceRequest, pk=pk)

        if request.user != service_request.accepted_professional and request.user != service_request.customer and not request.user.is_staff:
            return Response({'detail': 'Not authorized for this job.'}, status=status.HTTP_403_FORBIDDEN)

        if service_request.status != ServiceRequest.STATUS_ACCEPTED:
            return Response({'detail': f'Cannot move to In Progress from status {service_request.status}.'}, status=status.HTTP_400_BAD_REQUEST)

        service_request.status = ServiceRequest.STATUS_IN_PROGRESS
        service_request.save(update_fields=['status'])

        # Notify other party
        target_user = service_request.customer if request.user == service_request.accepted_professional else service_request.accepted_professional
        send_notification(
            recipient=target_user,
            notification_type=Notification.TYPE_JOB_IN_PROGRESS,
            title="Job In Progress",
            message=f"Work on '{service_request.title}' is now in progress.",
            resource_type='service_request',
            resource_id=service_request.id
        )

        return Response({'message': 'Job status updated to In Progress.', 'status': service_request.status})


class CompleteJobView(APIView):
    """
    Mark job as COMPLETED. Preserves history and unlocks two-way rating.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        with transaction.atomic():
            service_request = get_object_or_404(ServiceRequest.objects.select_for_update(), pk=pk)

            if request.user != service_request.accepted_professional and request.user != service_request.customer and not request.user.is_staff:
                return Response({'detail': 'Not authorized to complete this job.'}, status=status.HTTP_403_FORBIDDEN)

            if service_request.status not in [ServiceRequest.STATUS_ACCEPTED, ServiceRequest.STATUS_IN_PROGRESS]:
                return Response({'detail': f'Job cannot be marked complete from status {service_request.status}.'}, status=status.HTTP_400_BAD_REQUEST)

            service_request.status = ServiceRequest.STATUS_COMPLETED
            service_request.completed_at = timezone.now()
            service_request.save()

            # Increment completed jobs count for the professional
            if service_request.accepted_professional and hasattr(service_request.accepted_professional, 'professional_profile'):
                pro_profile = service_request.accepted_professional.professional_profile
                pro_profile.completed_jobs_count += 1
                pro_profile.save(update_fields=['completed_jobs_count'])

            # Send notification to both parties to leave ratings
            send_notification(
                recipient=service_request.customer,
                notification_type=Notification.TYPE_JOB_COMPLETED,
                title="Job Completed - Please Rate Your Professional",
                message=f"Your service request '{service_request.title}' has been marked completed. Share your feedback by rating the professional.",
                resource_type='service_request',
                resource_id=service_request.id
            )
            if service_request.accepted_professional:
                send_notification(
                    recipient=service_request.accepted_professional,
                    notification_type=Notification.TYPE_JOB_COMPLETED,
                    title="Job Completed - Rate Customer",
                    message=f"Service request '{service_request.title}' is completed. You can now leave a rating for the customer.",
                    resource_type='service_request',
                    resource_id=service_request.id
                )

        return Response({
            'message': 'Job marked as completed successfully. You may now submit a rating.',
            'status': service_request.status
        })


class CancelServiceRequestView(APIView):
    """
    Customer can cancel request if PENDING or ACCEPTED.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        reason = request.data.get('reason', '')
        with transaction.atomic():
            service_request = get_object_or_404(ServiceRequest.objects.select_for_update(), pk=pk)

            if request.user != service_request.customer and not request.user.is_staff:
                return Response({'detail': 'Only the customer who created this request can cancel it.'}, status=status.HTTP_403_FORBIDDEN)

            if service_request.status in [ServiceRequest.STATUS_COMPLETED, ServiceRequest.STATUS_CANCELLED]:
                return Response({'detail': f'Cannot cancel request with status {service_request.status}.'}, status=status.HTTP_400_BAD_REQUEST)

            service_request.status = ServiceRequest.STATUS_CANCELLED
            service_request.cancelled_by = request.user
            service_request.cancellation_reason = reason
            service_request.cancelled_at = timezone.now()
            service_request.save()

            # Notify accepted professional if assigned
            if service_request.accepted_professional:
                send_notification(
                    recipient=service_request.accepted_professional,
                    notification_type=Notification.TYPE_REQUEST_CANCELLED,
                    title="Service Request Cancelled",
                    message=f"Customer has cancelled request '{service_request.title}'. Reason: {reason or 'Not specified'}",
                    resource_type='service_request',
                    resource_id=service_request.id
                )

        return Response({'message': 'Service request cancelled successfully.', 'status': service_request.status})
