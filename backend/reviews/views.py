from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Avg

from .models import Review
from .serializers import ReviewSerializer, CreateReviewSerializer
from notifications.models import send_notification, Notification

class ReviewListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateReviewSerializer
        return ReviewSerializer

    def get_queryset(self):
        user_id = self.request.query_params.get('user')
        if user_id:
            return Review.objects.filter(reviewee_id=user_id).select_related('reviewer', 'reviewee', 'service_request')
        
        # Default: current user's reviews received
        return Review.objects.filter(reviewee=self.request.user).select_related('reviewer', 'reviewee', 'service_request')

    def create(self, request, *args, **kwargs):
        serializer = CreateReviewSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        review = serializer.save()

        # Send notification to reviewee
        send_notification(
            recipient=review.reviewee,
            notification_type=Notification.TYPE_REVIEW_RECEIVED,
            title=f"New {review.rating}-Star Review Received",
            message=f"{review.reviewer.get_full_name()} left you a {review.rating}-star review for '{review.service_request.title}'.",
            resource_type='service_request',
            resource_id=review.service_request.id
        )

        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class ProfessionalPublicReviewsView(generics.ListAPIView):
    """
    Publicly list genuine reviews received by a professional.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = ReviewSerializer

    def get_queryset(self):
        pro_id = self.kwargs.get('pro_id')
        return Review.objects.filter(
            reviewee__professional_profile__id=pro_id
        ).select_related('reviewer', 'reviewee', 'service_request')
