from django.urls import path
from .views import (
    ServiceRequestListCreateView,
    ServiceRequestDetailView,
    ProfessionalInboxView,
    ProfessionalAcceptRequestView,
    ProfessionalDeclineRequestView,
    UpdateJobProgressView,
    CompleteJobView,
    CancelServiceRequestView
)

urlpatterns = [
    path('requests/', ServiceRequestListCreateView.as_view(), name='service-request-list-create'),
    path('requests/<int:pk>/', ServiceRequestDetailView.as_view(), name='service-request-detail'),
    path('requests/<int:pk>/cancel/', CancelServiceRequestView.as_view(), name='service-request-cancel'),
    path('requests/<int:pk>/in-progress/', UpdateJobProgressView.as_view(), name='service-request-in-progress'),
    path('requests/<int:pk>/complete/', CompleteJobView.as_view(), name='service-request-complete'),
    path('professional/inbox/', ProfessionalInboxView.as_view(), name='professional-inbox'),
    path('professional/requests/<int:pk>/accept/', ProfessionalAcceptRequestView.as_view(), name='professional-accept-request'),
    path('professional/requests/<int:pk>/decline/', ProfessionalDeclineRequestView.as_view(), name='professional-decline-request'),
]
