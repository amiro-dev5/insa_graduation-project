from rest_framework import generics, permissions, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from django.shortcuts import get_object_or_404

from .models import City, SubCity, ServiceCategory, ProfessionalProfile, ProfessionalPortfolioItem, ProfessionalCertificate
from .serializers import (
    CitySerializer,
    ServiceCategorySerializer,
    ProfessionalPublicSerializer,
    ProfessionalDetailSerializer,
    ProfessionalPortfolioItemSerializer,
    ProfessionalCertificateSerializer
)
from fixit_backend.permissions import IsProfessional
from notifications.models import send_notification, Notification

class CityListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = City.objects.filter(is_active=True).prefetch_related('subcities')
    serializer_class = CitySerializer
    pagination_class = None


class ServiceCategoryListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = ServiceCategory.objects.filter(is_active=True)
    serializer_class = ServiceCategorySerializer
    pagination_class = None


class ProfessionalSearchView(generics.ListAPIView):
    """
    Search and filter approved, active professionals.
    Supports filtering by category, city, subcity, keyword search, and sorting.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = ProfessionalPublicSerializer

    def get_queryset(self):
        queryset = ProfessionalProfile.objects.filter(
            verification_status=ProfessionalProfile.STATUS_APPROVED,
            user__is_banned=False,
            user__is_active=True
        ).select_related('user', 'city', 'subcity').prefetch_related('categories', 'portfolio_items')

        category = self.request.query_params.get('category')
        if category:
            if category.isdigit():
                queryset = queryset.filter(categories__id=category)
            else:
                queryset = queryset.filter(categories__slug=category)

        city_id = self.request.query_params.get('city')
        if city_id:
            queryset = queryset.filter(city_id=city_id)

        subcity_id = self.request.query_params.get('subcity')
        if subcity_id:
            queryset = queryset.filter(subcity_id=subcity_id)

        search_query = self.request.query_params.get('q')
        if search_query:
            terms = search_query.strip().split()
            q_obj = Q()
            for term in terms:
                q_obj |= (
                    Q(bio__icontains=term) |
                    Q(previous_work_description__icontains=term) |
                    Q(service_area_description__icontains=term) |
                    Q(categories__name__icontains=term) |
                    Q(user__first_name__icontains=term) |
                    Q(user__last_name__icontains=term)
                )
            queryset = queryset.filter(q_obj)

        sort_by = self.request.query_params.get('ordering', '-average_rating')
        if sort_by in ['-average_rating', 'average_rating', '-completed_jobs_count', '-experience_years']:
            queryset = queryset.order_by(sort_by, '-id')
        else:
            queryset = queryset.order_by('-average_rating', '-id')

        return queryset.distinct()


class ProfessionalPublicDetailView(generics.RetrieveAPIView):
    """
    Public profile view for verified professionals.
    Does NOT expose private documents, national IDs, or direct contact phone.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = ProfessionalPublicSerializer
    lookup_field = 'id'

    def get_queryset(self):
        return ProfessionalProfile.objects.filter(
            verification_status=ProfessionalProfile.STATUS_APPROVED,
            user__is_banned=False
        ).select_related('user', 'city', 'subcity').prefetch_related('categories', 'portfolio_items')


class ProfessionalPortfolioListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsProfessional]
    parser_classes = [MultiPartParser, FormParser]
    serializer_class = ProfessionalPortfolioItemSerializer

    def get_queryset(self):
        return ProfessionalPortfolioItem.objects.filter(professional=self.request.user.professional_profile)

    def perform_create(self, serializer):
        serializer.save(professional=self.request.user.professional_profile)


class ProfessionalPortfolioDetailView(generics.RetrieveDestroyAPIView):
    permission_classes = [IsProfessional]
    serializer_class = ProfessionalPortfolioItemSerializer

    def get_queryset(self):
        return ProfessionalPortfolioItem.objects.filter(professional=self.request.user.professional_profile)


class CertificateResubmitView(APIView):
    permission_classes = [IsProfessional]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        profile = request.user.professional_profile
        certificate_file = request.FILES.get('certificate_file')
        title = request.data.get('title', 'Updated Professional Qualification')
        issued_by = request.data.get('issued_by', '')

        if not certificate_file:
            return Response({'certificate_file': ['A certificate document is required.']}, status=status.HTTP_400_BAD_REQUEST)

        # Create new certificate record
        cert = ProfessionalCertificate.objects.create(
            professional=profile,
            title=title,
            issued_by=issued_by,
            certificate_file=certificate_file
        )

        # Reset verification status to PENDING
        profile.verification_status = ProfessionalProfile.STATUS_PENDING
        profile.rejection_reason = ''
        profile.save(update_fields=['verification_status', 'rejection_reason'])

        send_notification(
            recipient=request.user,
            notification_type=Notification.TYPE_ADMIN_NOTICE,
            title="Certificate Resubmitted",
            message="Your updated qualification document has been submitted for administrative review."
        )

        return Response({
            'message': 'Certificate uploaded successfully and submitted for review.',
            'certificate_id': cert.id,
            'status': profile.verification_status
        }, status=status.HTTP_201_CREATED)
