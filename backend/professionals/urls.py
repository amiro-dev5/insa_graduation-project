from django.urls import path
from .views import (
    CityListView,
    ServiceCategoryListView,
    ProfessionalSearchView,
    ProfessionalPublicDetailView,
    ProfessionalPortfolioListCreateView,
    ProfessionalPortfolioDetailView,
    CertificateResubmitView
)

urlpatterns = [
    path('cities/', CityListView.as_view(), name='city-list'),
    path('categories/', ServiceCategoryListView.as_view(), name='category-list'),
    path('search/', ProfessionalSearchView.as_view(), name='professional-search'),
    path('<int:id>/', ProfessionalPublicDetailView.as_view(), name='professional-detail'),
    path('portfolio/', ProfessionalPortfolioListCreateView.as_view(), name='professional-portfolio-list'),
    path('portfolio/<int:pk>/', ProfessionalPortfolioDetailView.as_view(), name='professional-portfolio-detail'),
    path('certificate/resubmit/', CertificateResubmitView.as_view(), name='certificate-resubmit'),
]
