from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from wallet.views import ChapaWebhookView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/professionals/', include('professionals.urls')),
    path('api/services/', include('services.urls')),
    path('api/posts/', include('posts.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/reviews/', include('reviews.urls')),
    path('api/wallet/', include('wallet.urls')),
    path('api/support/', include('support.urls')),
    # Direct alias matching Chapa Dashboard webhook configuration
    path('chapa-webhook/', ChapaWebhookView.as_view(), name='chapa-webhook-direct'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
