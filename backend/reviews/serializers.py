from rest_framework import serializers
from .models import Review
from services.models import ServiceRequest

class ReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()
    reviewee_name = serializers.SerializerMethodField()
    reviewer_picture = serializers.SerializerMethodField()
    reviewee_picture = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id', 'service_request', 'reviewer', 'reviewer_name', 'reviewer_picture',
            'reviewee', 'reviewee_name', 'reviewee_picture', 'rating', 'comment', 'created_at'
        ]
        read_only_fields = ['id', 'reviewer', 'reviewee', 'created_at']

    def get_reviewer_name(self, obj):
        return obj.reviewer.get_full_name() or obj.reviewer.username

    def get_reviewee_name(self, obj):
        return obj.reviewee.get_full_name() or obj.reviewee.username

    def get_reviewer_picture(self, obj):
        return getattr(obj.reviewer, 'profile_picture_url', None)

    def get_reviewee_picture(self, obj):
        return getattr(obj.reviewee, 'profile_picture_url', None)


class CreateReviewSerializer(serializers.Serializer):
    service_request_id = serializers.IntegerField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        user = self.context['request'].user
        req_id = attrs['service_request_id']

        try:
            service_request = ServiceRequest.objects.get(pk=req_id)
        except ServiceRequest.DoesNotExist:
            raise serializers.ValidationError({'service_request_id': 'Service request does not exist.'})

        if service_request.status != ServiceRequest.STATUS_COMPLETED:
            raise serializers.ValidationError('You can only rate a service request after it has been completed.')

        # Check if user is participant
        if user != service_request.customer and user != service_request.accepted_professional:
            raise serializers.ValidationError('Only the customer or the assigned professional can review this job.')

        # Determine target reviewee
        reviewee = service_request.accepted_professional if user == service_request.customer else service_request.customer

        if not reviewee:
            raise serializers.ValidationError('Cannot review this request because the other party is not assigned.')

        # STRICT PROHIBITION: A user or professional can NEVER rate or review themselves
        if user.id == reviewee.id or user == reviewee:
            raise serializers.ValidationError('Users and professionals are strictly prohibited from rating or reviewing their own account.')

        # Identity linkage check
        if hasattr(user, 'phone_number') and hasattr(reviewee, 'phone_number') and user.phone_number and user.phone_number == reviewee.phone_number:
            raise serializers.ValidationError('Self-rating via matching phone identity is strictly prohibited.')

        # Check if already reviewed
        if Review.objects.filter(service_request=service_request, reviewer=user).exists():
            raise serializers.ValidationError('You have already submitted a review for this service request.')

        # Sanitize and validate comment length
        comment = attrs.get('comment', '').strip()
        if len(comment) > 2000:
            raise serializers.ValidationError({'comment': 'Review comments cannot exceed 2000 characters.'})
        attrs['comment'] = comment

        attrs['service_request'] = service_request
        attrs['reviewer'] = user
        attrs['reviewee'] = reviewee

        return attrs

    def create(self, validated_data):
        return Review.objects.create(
            service_request=validated_data['service_request'],
            reviewer=validated_data['reviewer'],
            reviewee=validated_data['reviewee'],
            rating=validated_data['rating'],
            comment=validated_data.get('comment', '')
        )
