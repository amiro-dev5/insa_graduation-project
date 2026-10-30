from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils import timezone
from .models import User, CustomerProfile
from notifications.models import send_notification, Notification

@admin.action(description="Ban selected users (Suspend account)")
def ban_selected_users(modeladmin, request, queryset):
    for user in queryset:
        user.is_banned = True
        user.banned_at = timezone.now()
        user.ban_reason = "Account suspended by administrator for marketplace policy compliance."
        user.save(update_fields=['is_banned', 'banned_at', 'ban_reason'])
        
        send_notification(
            recipient=user,
            notification_type=Notification.TYPE_ADMIN_NOTICE,
            title="Account Suspended",
            message="Your account has been suspended by an administrator. Please contact support for assistance."
        )

@admin.action(description="Unban selected users (Restore account)")
def unban_selected_users(modeladmin, request, queryset):
    for user in queryset:
        user.is_banned = False
        user.banned_at = None
        user.ban_reason = ""
        user.save(update_fields=['is_banned', 'banned_at', 'ban_reason'])

        send_notification(
            recipient=user,
            notification_type=Notification.TYPE_ADMIN_NOTICE,
            title="Account Restored",
            message="Your account access has been restored. You can now use all FixIt features."
        )

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'first_name', 'last_name', 'phone_number', 'role', 'is_banned', 'is_staff', 'created_at')
    list_filter = ('role', 'is_banned', 'is_staff', 'is_active')
    search_fields = ('username', 'first_name', 'last_name', 'phone_number', 'email')
    actions = [ban_selected_users, unban_selected_users]

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Marketplace Role & Phone', {'fields': ('role', 'phone_number')}),
        ('Moderation & Ban Status', {'fields': ('is_banned', 'ban_reason', 'banned_at')}),
    )


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'city', 'subcity', 'created_at')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'user__phone_number')
    list_filter = ('city', 'subcity')
    # Keep fayda_id protected
    fields = ('user', 'city', 'subcity', 'address_details', 'profile_picture', 'fayda_id', 'created_at', 'updated_at')
    readonly_fields = ('created_at', 'updated_at')
