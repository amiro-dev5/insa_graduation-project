from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import CustomerProfile, normalize_ethiopian_phone, validate_profile_picture_file
from professionals.models import (
    ProfessionalProfile, 
    ProfessionalCertificate, 
    City, 
    SubCity, 
    ServiceCategory,
    validate_certificate_file
)
from notifications.models import send_notification, Notification

User = get_user_model()

class CitySimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = ['id', 'name']


class SubCitySimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubCity
        fields = ['id', 'name', 'city']


class ServiceCategorySimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = ['id', 'name', 'slug', 'description', 'icon_name']


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'full_name',
            'email', 'phone_number', 'role', 'preferred_language', 'preferred_theme', 'is_banned', 'ban_reason', 'created_at'
        ]
        read_only_fields = ['id', 'role', 'is_banned', 'ban_reason', 'created_at']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class CustomerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    city_details = CitySimpleSerializer(source='city', read_only=True)
    subcity_details = SubCitySimpleSerializer(source='subcity', read_only=True)

    class Meta:
        model = CustomerProfile
        fields = [
            'id', 'user', 'city', 'subcity', 'city_details', 'subcity_details',
            'address_details', 'profile_picture', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class CustomerRegistrationSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone_number = serializers.CharField(max_length=20)
    email = serializers.EmailField(required=False, allow_blank=True)
    city_id = serializers.IntegerField(required=False, allow_null=True)
    subcity_id = serializers.IntegerField(required=False, allow_null=True)
    address_details = serializers.CharField(required=False, allow_blank=True, default='')
    fayda_id = serializers.CharField(required=False, allow_blank=True, default='')
    profile_picture = serializers.ImageField(required=True, validators=[validate_profile_picture_file])

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_phone_number(self, value):
        normalized = normalize_ethiopian_phone(value)
        if User.objects.filter(phone_number=normalized).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        return normalized

    def create(self, validated_data):
        with transaction.atomic():
            user = User.objects.create_user(
                username=validated_data['username'],
                password=validated_data['password'],
                first_name=validated_data['first_name'],
                last_name=validated_data['last_name'],
                email=validated_data.get('email', ''),
                phone_number=validated_data['phone_number'],
                role=User.ROLE_CUSTOMER
            )

            city = None
            if validated_data.get('city_id'):
                city = City.objects.filter(id=validated_data['city_id']).first()

            subcity = None
            if validated_data.get('subcity_id'):
                subcity = SubCity.objects.filter(id=validated_data['subcity_id']).first()

            CustomerProfile.objects.create(
                user=user,
                city=city,
                subcity=subcity,
                address_details=validated_data.get('address_details', ''),
                fayda_id=validated_data.get('fayda_id', ''),
                profile_picture=validated_data.get('profile_picture')
            )

            send_notification(
                recipient=user,
                notification_type=Notification.TYPE_ADMIN_NOTICE,
                title="Welcome to FixIt",
                message="Welcome to FixIt! Discover vetted local professionals, post service requests, and track your repairs easily."
            )

            return user


class ProfessionalRegistrationSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone_number = serializers.CharField(max_length=20)
    email = serializers.EmailField(required=False, allow_blank=True)
    city_id = serializers.IntegerField()
    subcity_id = serializers.IntegerField(required=False, allow_null=True)
    category_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
    bio = serializers.CharField(max_length=2000)
    experience_years = serializers.IntegerField(min_value=0, default=1)
    previous_work_description = serializers.CharField(required=False, allow_blank=True, default='')
    service_area_description = serializers.CharField(required=False, allow_blank=True, default='')
    
    # Mandatory certificate & profile photo
    profile_picture = serializers.ImageField(required=True, validators=[validate_profile_picture_file])
    certificate_title = serializers.CharField(max_length=200)
    certificate_file = serializers.FileField(validators=[validate_certificate_file])
    certificate_issued_by = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_phone_number(self, value):
        normalized = normalize_ethiopian_phone(value)
        if User.objects.filter(phone_number=normalized).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
        return normalized

    def create(self, validated_data):
        with transaction.atomic():
            user = User.objects.create_user(
                username=validated_data['username'],
                password=validated_data['password'],
                first_name=validated_data['first_name'],
                last_name=validated_data['last_name'],
                email=validated_data.get('email', ''),
                phone_number=validated_data['phone_number'],
                role=User.ROLE_PROFESSIONAL
            )

            city = City.objects.filter(id=validated_data['city_id']).first()
            subcity = None
            if validated_data.get('subcity_id'):
                subcity = SubCity.objects.filter(id=validated_data['subcity_id']).first()

            pro_profile = ProfessionalProfile.objects.create(
                user=user,
                city=city,
                subcity=subcity,
                bio=validated_data['bio'],
                experience_years=validated_data.get('experience_years', 1),
                previous_work_description=validated_data.get('previous_work_description', ''),
                service_area_description=validated_data.get('service_area_description', ''),
                profile_picture=validated_data.get('profile_picture'),
                verification_status=ProfessionalProfile.STATUS_PENDING
            )

            # Set categories
            categories = ServiceCategory.objects.filter(id__in=validated_data['category_ids'])
            pro_profile.categories.set(categories)

            # Create required certificate
            ProfessionalCertificate.objects.create(
                professional=pro_profile,
                title=validated_data['certificate_title'],
                issued_by=validated_data.get('certificate_issued_by', ''),
                certificate_file=validated_data['certificate_file']
            )

            send_notification(
                recipient=user,
                notification_type=Notification.TYPE_ADMIN_NOTICE,
                title="Registration Received - Verification Pending",
                message="Thank you for registering on FixIt. Your qualification certificate has been submitted for administrative review. You will be notified once approved."
            )

            return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user

        if user.is_banned:
            raise serializers.ValidationError({
                'detail': 'Your account has been suspended by an administrator.',
                'ban_reason': user.ban_reason or 'Terms of service violation.'
            })

        data['user'] = {
            'id': user.id,
            'username': user.username,
            'full_name': user.get_full_name() or user.username,
            'email': user.email,
            'phone_number': user.phone_number,
            'role': user.role,
            'preferred_language': user.preferred_language,
            'preferred_theme': user.preferred_theme,
            'is_banned': user.is_banned,
            'profile_picture': user.profile_picture_url,
        }

        if user.is_professional and hasattr(user, 'professional_profile'):
            profile = user.professional_profile
            data['user']['verification_status'] = profile.verification_status
            data['user']['rejection_reason'] = profile.rejection_reason
            data['user']['average_rating'] = float(profile.average_rating)
            data['user']['completed_jobs_count'] = profile.completed_jobs_count
        elif user.is_customer and hasattr(user, 'customer_profile'):
            c_profile = user.customer_profile
            data['user']['city'] = c_profile.city.name if c_profile.city else None
            data['user']['subcity'] = c_profile.subcity.name if c_profile.subcity else None

        return data
