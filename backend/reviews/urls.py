from django.urls import path
from .views import ReviewListCreateView, ProfessionalPublicReviewsView

urlpatterns = [
    path('', ReviewListCreateView.as_view(), name='review-list-create'),
    path('professional/<int:pro_id>/', ProfessionalPublicReviewsView.as_view(), name='professional-reviews'),
]
