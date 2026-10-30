from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomerRegistrationView,
    ProfessionalRegistrationView,
    CustomLoginView,
    CurrentUserView,
    ChangePasswordView
)

urlpatterns = [
    path('register/customer/', CustomerRegistrationView.as_view(), name='register-customer'),
    path('register/professional/', ProfessionalRegistrationView.as_view(), name='register-professional'),
    path('login/', CustomLoginView.as_view(), name='token-obtain-pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
]
