from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

def validate_certificate_file(file):
    max_size = 5 * 1024 * 1024  # 5 MB limit
    if file.size > max_size:
        raise ValidationError("Certificate file size cannot exceed 5MB.")
    
    valid_extensions = ('.pdf', '.jpg', '.jpeg', '.png')
    if not file.name.lower().endswith(valid_extensions):
        raise ValidationError("Certificate file must be a PDF, JPG, or PNG document.")


class City(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Cities'
        ordering = ['name']

    def __str__(self):
        return self.name


class SubCity(models.Model):
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='subcities')
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Sub-cities'
        unique_together = ('city', 'name')
        ordering = ['city__name', 'name']

    def __str__(self):
        return f"{self.name}, {self.city.name}"


class ServiceCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')
    icon_name = models.CharField(max_length=50, default='Wrench')
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Service Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class ProfessionalProfile(models.Model):
    STATUS_PENDING = 'PENDING'
    STATUS_APPROVED = 'APPROVED'
    STATUS_REJECTED = 'REJECTED'

    STATUS_CHOICES = (
        (STATUS_PENDING, 'Pending Review'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
    )

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='professional_profile')
    categories = models.ManyToManyField(ServiceCategory, related_name='professionals', blank=True)
    city = models.ForeignKey(City, on_delete=models.SET_NULL, null=True, blank=True, related_name='professionals')
    subcity = models.ForeignKey(SubCity, on_delete=models.SET_NULL, null=True, blank=True, related_name='professionals')
    service_area_description = models.CharField(max_length=255, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    experience_years = models.PositiveIntegerField(default=1)
    previous_work_description = models.TextField(blank=True, default='')
    profile_picture = models.ImageField(upload_to='profiles/professionals/', null=True, blank=True)
    
    verification_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    rejection_reason = models.TextField(blank=True, default='')
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='moderated_professionals')
    
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    completed_jobs_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_verified(self):
        return self.verification_status == self.STATUS_APPROVED

    def __str__(self):
        return f"Professional: {self.user.get_full_name() or self.user.username} ({self.verification_status})"


class ProfessionalCertificate(models.Model):
    professional = models.ForeignKey(ProfessionalProfile, on_delete=models.CASCADE, related_name='certificates')
    title = models.CharField(max_length=200)
    issued_by = models.CharField(max_length=200, blank=True, default='')
    certificate_file = models.FileField(upload_to='certificates/', validators=[validate_certificate_file])
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.title} - {self.professional.user.get_full_name()}"


class ProfessionalPortfolioItem(models.Model):
    professional = models.ForeignKey(ProfessionalProfile, on_delete=models.CASCADE, related_name='portfolio_items')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    image = models.ImageField(upload_to='portfolio/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.professional.user.get_full_name()}"
