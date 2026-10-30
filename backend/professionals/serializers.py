from rest_framework import serializers
from .models import City, SubCity, ServiceCategory, ProfessionalProfile, ProfessionalCertificate, ProfessionalPortfolioItem
from reviews.models import Review

class SubCitySerializer(serializers.ModelSerializer):
    class Meta:
        model = SubCity
        fields = ['id', 'name', 'city', 'is_active']


class CitySerializer(serializers.ModelSerializer):
    subcities = SubCitySerializer(many=True, read_only=True)

    class Meta:
        model = City
        fields = ['id', 'name', 'is_active', 'subcities']


class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = ['id', 'name', 'slug', 'description', 'icon_name', 'is_active']


class ProfessionalPortfolioItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfessionalPortfolioItem
        fields = ['id', 'title', 'description', 'image', 'created_at']
        read_only_fields = ['id', 'created_at']


class ProfessionalCertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfessionalCertificate
        fields = ['id', 'title', 'issued_by', 'certificate_file', 'uploaded_at', 'is_verified']
        read_only_fields = ['id', 'uploaded_at', 'is_verified']


class ProfessionalPublicSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    full_name = serializers.SerializerMethodField()
    city_name = serializers.CharField(source='city.name', read_only=True, default='')
    subcity_name = serializers.CharField(source='subcity.name', read_only=True, default='')
    categories = ServiceCategorySerializer(many=True, read_only=True)
    portfolio_items = ProfessionalPortfolioItemSerializer(many=True, read_only=True)
    reviews_count = serializers.SerializerMethodField()

    class Meta:
        model = ProfessionalProfile
        fields = [
            'id', 'user_id', 'full_name', 'profile_picture', 'city_name', 'subcity_name',
            'city', 'subcity', 'service_area_description', 'categories', 'bio',
            'experience_years', 'previous_work_description', 'verification_status',
            'average_rating', 'completed_jobs_count', 'portfolio_items', 'reviews_count'
        ]

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_reviews_count(self, obj):
        return Review.objects.filter(reviewee=obj.user).count()


class ProfessionalDetailSerializer(ProfessionalPublicSerializer):
    certificates = ProfessionalCertificateSerializer(many=True, read_only=True)

    class Meta(ProfessionalPublicSerializer.Meta):
        fields = ProfessionalPublicSerializer.Meta.fields + ['certificates', 'rejection_reason']


ProfessionalProfileSerializer = ProfessionalDetailSerializer
