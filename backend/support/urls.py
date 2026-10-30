from django.urls import path
from .views import SupportChatView, SupportHistoryView

urlpatterns = [
    path('chat/', SupportChatView.as_view(), name='support-chat'),
    path('history/', SupportHistoryView.as_view(), name='support-history'),
]
