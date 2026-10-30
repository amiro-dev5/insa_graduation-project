from django.contrib import admin
from django.utils import timezone
from .models import City, SubCity, ServiceCategory, ProfessionalProfile, ProfessionalCertificate, ProfessionalPortfolioItem
from notifications.models import send_notification, Notification

@admin.action(description="Approve selected professionals verification")
def approve_verification(modeladmin, request, queryset):
    for profile in queryset:
        profile.verification_status = ProfessionalProfile.STATUS_APPROVED
        profile.verified_at = timezone.now()
        profile.verified_by = request.user
        profile.rejection_reason = ""
        profile.save(update_fields=['verification_status', 'verified_at', 'verified_by', 'rejection_reason'])

        # Mark latest certificate verified
        profile.certificates.update(is_verified=True)

        send_notification(
            recipient=profile.user,
            notification_type=Notification.TYPE_VERIFICATION_APPROVED,
            title="Professional Verification Approved!",
            message="Congratulations! Your professional credentials have been approved. You are now visible in customer search results and can receive service requests.",
            resource_type='profile',
            resource_id=profile.id
        )

@admin.action(description="Reject selected professionals verification")
def reject_verification(modeladmin, request, queryset):
    for profile in queryset:
        profile.verification_status = ProfessionalProfile.STATUS_REJECTED
        profile.rejection_reason = "Qualification documents could not be verified. Please provide a clear, government-recognized certificate or occupational license."
        profile.save(update_fields=['verification_status', 'rejection_reason'])

        send_notification(
            recipient=profile.user,
            notification_type=Notification.TYPE_VERIFICATION_REJECTED,
            title="Verification Rejected",
            message=f"Your verification was rejected: {profile.rejection_reason}. You can re-upload your valid certificate from your dashboard.",
            resource_type='profile',
            resource_id=profile.id
        )


class ProfessionalCertificateInline(admin.TabularInline):
    model = ProfessionalCertificate
    extra = 0
    fields = ('title', 'issued_by', 'certificate_file', 'uploaded_at', 'is_verified')
    readonly_fields = ('uploaded_at',)


class ProfessionalPortfolioItemInline(admin.TabularInline):
    model = ProfessionalPortfolioItem
    extra = 0
    fields = ('title', 'description', 'image', 'created_at')
    readonly_fields = ('created_at',)


@admin.register(ProfessionalProfile)
class ProfessionalProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'verification_status', 'city', 'subcity', 
        'average_rating', 'completed_jobs_count', 'created_at'
    )
    list_filter = ('verification_status', 'city', 'categories')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'user__phone_number', 'bio')
    inlines = [ProfessionalCertificateInline, ProfessionalPortfolioItemInline]
    actions = [approve_verification, reject_verification]
    readonly_fields = ('verified_at', 'verified_by', 'average_rating', 'completed_jobs_count', 'created_at', 'updated_at')


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active')
    search_fields = ('name',)
    list_filter = ('is_active',)


@admin.register(SubCity)
class SubCityAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'is_active')
    search_fields = ('name', 'city__name')
    list_filter = ('city', 'is_active')


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'icon_name', 'is_active')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name', 'description')
    list_filter = ('is_active',)


@admin.register(ProfessionalCertificate)
class ProfessionalCertificateAdmin(admin.ModelAdmin):
    list_display = ('title', 'professional', 'issued_by', 'uploaded_at', 'is_verified')
    list_filter = ('is_verified', 'uploaded_at')
    search_fields = ('title', 'professional__user__username', 'issued_by')
