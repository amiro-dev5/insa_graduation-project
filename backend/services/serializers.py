from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from .models import ServiceRequest, ServiceRequestRecipient
from professionals.models import ServiceCategory, City, SubCity, ProfessionalProfile
from notifications.models import send_notification, Notification

User = get_user_model()

class RecipientDetailSerializer(serializers.ModelSerializer):
    professional_id = serializers.IntegerField(source='professional.id', read_only=True)
    professional_name = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    phone_number = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequestRecipient
        fields = [
            'id', 'professional_id', 'professional_name', 'profile_picture',
            'average_rating', 'phone_number', 'status', 'declined_reason',
            'responded_at', 'created_at'
        ]

    def get_professional_name(self, obj):
        return obj.professional.get_full_name() or obj.professional.username

    def get_profile_picture(self, obj):
        if hasattr(obj.professional, 'professional_profile') and obj.professional.professional_profile.profile_picture:
            return obj.professional.professional_profile.profile_picture.url
        return None

    def get_average_rating(self, obj):
        if hasattr(obj.professional, 'professional_profile'):
            return float(obj.professional.professional_profile.average_rating)
        return 0.0

    def get_phone_number(self, obj):
        # Phone of the professional is only shown if this professional is the accepted one
        if obj.request.accepted_professional == obj.professional:
            return obj.professional.phone_number
        return None


class ServiceRequestListSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_picture = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    city_name = serializers.CharField(source='city.name', read_only=True)
    subcity_name = serializers.CharField(source='subcity.name', read_only=True, default='')
    accepted_professional_name = serializers.SerializerMethodField()
    accepted_professional_picture = serializers.SerializerMethodField()
    recipients_count = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequest
        fields = [
            'id', 'customer', 'customer_name', 'customer_picture', 'category', 'category_name',
            'city', 'city_name', 'subcity', 'subcity_name', 'title', 'description',
            'preferred_date', 'status', 'accepted_professional', 'accepted_professional_name',
            'accepted_professional_picture', 'recipients_count', 'created_at', 'completed_at', 'cancelled_at'
        ]

    def get_customer_name(self, obj):
        return obj.customer.get_full_name() or obj.customer.username

    def get_customer_picture(self, obj):
        if hasattr(obj.customer, 'customer_profile') and obj.customer.customer_profile.profile_picture:
            return obj.customer.customer_profile.profile_picture.url
        return None

    def get_accepted_professional_name(self, obj):
        if obj.accepted_professional:
            return obj.accepted_professional.get_full_name() or obj.accepted_professional.username
        return None

    def get_accepted_professional_picture(self, obj):
        if obj.accepted_professional and hasattr(obj.accepted_professional, 'professional_profile') and obj.accepted_professional.professional_profile.profile_picture:
            return obj.accepted_professional.professional_profile.profile_picture.url
        return None

    def get_accepted_professional_picture(self, obj):
        if obj.accepted_professional and hasattr(obj.accepted_professional, 'professional_profile') and obj.accepted_professional.professional_profile.profile_picture:
            return obj.accepted_professional.professional_profile.profile_picture.url
        return None

    def get_recipients_count(self, obj):
        return obj.recipients.count()


class ServiceRequestDetailSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_picture = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    service_address = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    city_name = serializers.CharField(source='city.name', read_only=True)
    subcity_name = serializers.CharField(source='subcity.name', read_only=True, default='')
    accepted_professional_name = serializers.SerializerMethodField()
    accepted_professional_picture = serializers.SerializerMethodField()
    accepted_professional_phone = serializers.SerializerMethodField()
    recipients = RecipientDetailSerializer(many=True, read_only=True)
    has_customer_reviewed = serializers.SerializerMethodField()
    has_professional_reviewed = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequest
        fields = [
            'id', 'customer', 'customer_name', 'customer_picture', 'customer_phone', 'category', 'category_name',
            'city', 'city_name', 'subcity', 'subcity_name', 'title', 'description',
            'service_address', 'preferred_date', 'status', 'accepted_professional',
            'accepted_professional_name', 'accepted_professional_picture', 'accepted_professional_phone',
            'cancellation_reason', 'cancelled_by', 'accepted_at', 'completed_at',
            'cancelled_at', 'created_at', 'updated_at', 'recipients',
            'has_customer_reviewed', 'has_professional_reviewed'
        ]

    def get_customer_name(self, obj):
        return obj.customer.get_full_name() or obj.customer.username

    def get_customer_picture(self, obj):
        if hasattr(obj.customer, 'customer_profile') and obj.customer.customer_profile.profile_picture:
            return obj.customer.customer_profile.profile_picture.url
        return None

    def get_customer_phone(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None

        # Customer themselves can always see their phone
        if request.user == obj.customer or request.user.is_staff:
            return obj.customer.phone_number

        # Professional can ONLY see customer phone IF they are the accepted professional!
        if obj.accepted_professional == request.user:
            return obj.customer.phone_number

        return "Hidden until acceptance"

    def get_service_address(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None

        if request.user == obj.customer or request.user.is_staff:
            return obj.service_address

        if obj.accepted_professional == request.user:
            return obj.service_address

        return "Hidden until acceptance"

    def get_accepted_professional_name(self, obj):
        if obj.accepted_professional:
            return obj.accepted_professional.get_full_name() or obj.accepted_professional.username
        return None

    def get_accepted_professional_picture(self, obj):
        if obj.accepted_professional and hasattr(obj.accepted_professional, 'professional_profile') and obj.accepted_professional.professional_profile.profile_picture:
            return obj.accepted_professional.professional_profile.profile_picture.url
        return None

    def get_accepted_professional_phone(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None

        if obj.accepted_professional and (request.user == obj.customer or request.user == obj.accepted_professional or request.user.is_staff):
            return obj.accepted_professional.phone_number
        return None

    def get_has_customer_reviewed(self, obj):
        return obj.reviews.filter(reviewer=obj.customer).exists()

    def get_has_professional_reviewed(self, obj):
        if obj.accepted_professional:
            return obj.reviews.filter(reviewer=obj.accepted_professional).exists()
        return False


class CreateServiceRequestSerializer(serializers.Serializer):
    category_id = serializers.IntegerField()
    city_id = serializers.IntegerField()
    subcity_id = serializers.IntegerField(required=False, allow_null=True)
    title = serializers.CharField(max_length=200)
    description = serializers.CharField()
    service_address = serializers.CharField(max_length=255)
    preferred_date = serializers.DateField(required=False, allow_null=True)
    selected_professional_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
        max_length=3  # Strictly enforces at most 3 selected professionals
    )

    def validate_selected_professional_ids(self, value):
        if len(value) < 1:
            raise serializers.ValidationError("Please select at least 1 professional.")
        if len(value) > 3:
            raise serializers.ValidationError("You can select up to 3 professionals for one service request.")
        
        # Check for duplicates in list
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Duplicate professionals selected.")

        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.id in value:
            raise serializers.ValidationError("You cannot dispatch a service request to yourself.")

        # Ensure all selected professionals exist, are active, approved, and not banned
        pros = ProfessionalProfile.objects.filter(
            user_id__in=value,
            verification_status=ProfessionalProfile.STATUS_APPROVED,
            user__is_banned=False,
            user__is_active=True
        )
        if pros.count() != len(value):
            raise serializers.ValidationError("One or more selected professionals are not eligible or verified.")

        return value

    def create(self, validated_data):
        customer = self.context['request'].user
        category = ServiceCategory.objects.get(id=validated_data['category_id'])
        city = City.objects.get(id=validated_data['city_id'])
        subcity = None
        if validated_data.get('subcity_id'):
            subcity = SubCity.objects.filter(id=validated_data['subcity_id']).first()

        selected_pro_ids = validated_data['selected_professional_ids']

        with transaction.atomic():
            service_request = ServiceRequest.objects.create(
                customer=customer,
                category=category,
                city=city,
                subcity=subcity,
                title=validated_data['title'],
                description=validated_data['description'],
                service_address=validated_data['service_address'],
                preferred_date=validated_data.get('preferred_date'),
                status=ServiceRequest.STATUS_PENDING
            )

            # Create recipients and send in-app persistent notifications
            for pro_id in selected_pro_ids:
                pro_user = User.objects.get(id=pro_id)
                ServiceRequestRecipient.objects.create(
                    request=service_request,
                    professional=pro_user,
                    status=ServiceRequestRecipient.STATUS_PENDING
                )

                subcity_str = f", {subcity.name}" if subcity else ""
                send_notification(
                    recipient=pro_user,
                    notification_type=Notification.TYPE_SERVICE_REQUEST,
                    title=f"New Service Request: {category.name}",
                    message=f"A customer in {city.name}{subcity_str} requested service for '{service_request.title}'. Review and respond to connect.",
                    resource_type='service_request',
                    resource_id=service_request.id
                )

            return service_request
