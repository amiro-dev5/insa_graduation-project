from django.contrib import admin
from .models import ServiceRequest, ServiceRequestRecipient

class ServiceRequestRecipientInline(admin.TabularInline):
    model = ServiceRequestRecipient
    extra = 0
    fields = ('professional', 'status', 'declined_reason', 'responded_at', 'created_at')
    readonly_fields = ('responded_at', 'created_at')


@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'customer', 'category', 'city', 'status', 'accepted_professional', 'created_at')
    list_filter = ('status', 'category', 'city')
    search_fields = ('title', 'description', 'customer__username', 'customer__first_name', 'customer__last_name')
    inlines = [ServiceRequestRecipientInline]
    readonly_fields = ('created_at', 'updated_at', 'accepted_at', 'completed_at', 'cancelled_at')


@admin.register(ServiceRequestRecipient)
class ServiceRequestRecipientAdmin(admin.ModelAdmin):
    list_display = ('request', 'professional', 'status', 'responded_at', 'created_at')
    list_filter = ('status',)
    search_fields = ('request__title', 'professional__username')
