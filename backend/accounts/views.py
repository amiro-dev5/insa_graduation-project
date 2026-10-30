from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from django.contrib.auth import get_user_model
from .serializers import (
    CustomerRegistrationSerializer,
    ProfessionalRegistrationSerializer,
    CustomTokenObtainPairSerializer,
    UserSerializer,
    CustomerProfileSerializer,
    ChangePasswordSerializer
)
from professionals.serializers import ProfessionalProfileSerializer
from .models import CustomerProfile

User = get_user_model()

class CustomLoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class CustomerRegistrationView(APIView):
    permission_classes = [permissions.AllowAny]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request):
        data = {}
        for key, value in request.data.items():
            data[key] = value
        for key, value in request.FILES.items():
            data[key] = value

        serializer = CustomerRegistrationSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Customer registered successfully.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'full_name': user.get_full_name() or user.username,
                'email': user.email,
                'phone_number': user.phone_number,
                'role': user.role,
                'is_banned': user.is_banned,
                'profile_picture': user.profile_picture_url,
            }
        }, status=status.HTTP_201_CREATED)


class ProfessionalRegistrationView(APIView):
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        # Support array category_ids from formData or json
        data = {}
        for key, value in request.data.items():
            data[key] = value
        for key, value in request.FILES.items():
            data[key] = value

        if hasattr(request.data, 'getlist') and len(request.data.getlist('category_ids')) > 1:
            data['category_ids'] = [int(x) for x in request.data.getlist('category_ids')]
        elif 'category_ids' in data:
            raw_cats = data['category_ids']
            if isinstance(raw_cats, str):
                import json
                try:
                    parsed = json.loads(raw_cats)
                    data['category_ids'] = parsed if isinstance(parsed, list) else [parsed]
                except Exception:
                    data['category_ids'] = [int(x) for x in raw_cats.split(',') if x.strip()]
            elif isinstance(raw_cats, list):
                data['category_ids'] = [int(x) for x in raw_cats]
        
        serializer = ProfessionalRegistrationSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Professional registration submitted successfully. Your certificate is pending review.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'full_name': user.get_full_name() or user.username,
                'email': user.email,
                'phone_number': user.phone_number,
                'role': user.role,
                'verification_status': user.professional_profile.verification_status,
                'is_banned': user.is_banned,
                'profile_picture': user.profile_picture_url,
            }
        }, status=status.HTTP_201_CREATED)


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': user.get_full_name() or user.username,
            'email': user.email,
            'phone_number': user.phone_number,
            'role': user.role,
            'preferred_language': user.preferred_language,
            'preferred_theme': user.preferred_theme,
            'is_banned': user.is_banned,
            'ban_reason': user.ban_reason if user.is_banned else '',
            'profile_picture': user.profile_picture_url,
        }

        if user.is_professional and hasattr(user, 'professional_profile'):
            profile = user.professional_profile
            data['professional_profile'] = {
                'id': profile.id,
                'verification_status': profile.verification_status,
                'rejection_reason': profile.rejection_reason,
                'average_rating': float(profile.average_rating),
                'completed_jobs_count': profile.completed_jobs_count,
                'bio': profile.bio,
                'experience_years': profile.experience_years,
                'city': profile.city.name if profile.city else None,
                'city_id': profile.city_id,
                'subcity': profile.subcity.name if profile.subcity else None,
                'subcity_id': profile.subcity_id,
                'service_area_description': profile.service_area_description,
                'profile_picture': profile.profile_picture.url if profile.profile_picture else None,
                'categories': [{'id': c.id, 'name': c.name, 'slug': c.slug} for c in profile.categories.all()]
            }
        elif user.is_customer and hasattr(user, 'customer_profile'):
            profile = user.customer_profile
            data['customer_profile'] = {
                'id': profile.id,
                'city': profile.city.name if profile.city else None,
                'city_id': profile.city_id,
                'subcity': profile.subcity.name if profile.subcity else None,
                'subcity_id': profile.subcity_id,
                'address_details': profile.address_details,
                'profile_picture': profile.profile_picture.url if profile.profile_picture else None,
            }

        return Response(data)

    def patch(self, request):
        user = request.user
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        email = request.data.get('email')
        preferred_language = request.data.get('preferred_language')
        preferred_theme = request.data.get('preferred_theme')

        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if email is not None:
            user.email = email
        if preferred_language in ['en', 'am', 'om']:
            user.preferred_language = preferred_language
        if preferred_theme in ['light', 'dark']:
            user.preferred_theme = preferred_theme
        user.save()

        # Update profile specifics if supplied
        if user.is_customer and hasattr(user, 'customer_profile'):
            profile = user.customer_profile
            if 'city_id' in request.data:
                profile.city_id = request.data['city_id']
            if 'subcity_id' in request.data:
                profile.subcity_id = request.data['subcity_id']
            if 'address_details' in request.data:
                profile.address_details = request.data['address_details']
            if 'profile_picture' in request.FILES:
                profile.profile_picture = request.FILES['profile_picture']
            profile.save()

        elif user.is_professional and hasattr(user, 'professional_profile'):
            profile = user.professional_profile
            if 'city_id' in request.data:
                profile.city_id = request.data['city_id']
            if 'subcity_id' in request.data:
                profile.subcity_id = request.data['subcity_id']
            if 'bio' in request.data:
                profile.bio = request.data['bio']
            if 'service_area_description' in request.data:
                profile.service_area_description = request.data['service_area_description']
            if 'profile_picture' in request.FILES:
                profile.profile_picture = request.FILES['profile_picture']
            if 'category_ids' in request.data:
                cat_ids = request.data['category_ids']
                if isinstance(cat_ids, str):
                    import json
                    try:
                        cat_ids = json.loads(cat_ids)
                    except Exception:
                        cat_ids = [int(x) for x in cat_ids.split(',') if x.strip()]
                profile.categories.set(cat_ids)
            profile.save()

        return self.get(request)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user

        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'old_password': ['Incorrect current password.']}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password changed successfully.'}, status=status.HTTP_200_OK)
