from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
import re

def normalize_ethiopian_phone(phone: str) -> str:
    """
    Normalizes Ethiopian phone numbers into international format +251XXXXXXXXX.
    Supported prefixes: 09, 07, +2519, +2517, 2519, 2517.
    """
    if not phone:
        return ''
    cleaned = re.sub(r'[\s\-\(\)]', '', phone.strip())
    if cleaned.startswith('+251'):
        body = cleaned[4:]
    elif cleaned.startswith('251'):
        body = cleaned[3:]
    elif cleaned.startswith('0'):
        body = cleaned[1:]
    else:
        body = cleaned

    if len(body) == 9 and body.startswith(('9', '7')):
        return f'+251{body}'
    raise ValidationError("Invalid Ethiopian phone number. Must be a valid 9 or 7 series (e.g., 0911234567 or 0712345678).")


def validate_profile_picture_file(file):
    max_size = 5 * 1024 * 1024  # 5 MB
    if file.size > max_size:
        raise ValidationError("Profile picture file size cannot exceed 5MB.")

    valid_extensions = ('.jpg', '.jpeg', '.png', '.webp')
    if not file.name.lower().endswith(valid_extensions):
        raise ValidationError("Profile picture must be a JPG, PNG, or WEBP image.")

    try:
        from PIL import Image
        image = Image.open(file)
        image.verify()
        if hasattr(file, 'seek'):
            file.seek(0)
    except Exception:
        raise ValidationError("Uploaded file is not a valid image.")


class User(AbstractUser):
    ROLE_CUSTOMER = 'CUSTOMER'
    ROLE_PROFESSIONAL = 'PROFESSIONAL'
    ROLE_ADMIN = 'ADMIN'

    ROLE_CHOICES = (
        (ROLE_CUSTOMER, 'Customer'),
        (ROLE_PROFESSIONAL, 'Professional'),
        (ROLE_ADMIN, 'Administrator'),
    )

    LANG_EN = 'en'
    LANG_AM = 'am'
    LANG_OM = 'om'

    LANG_CHOICES = (
        (LANG_EN, 'English'),
        (LANG_AM, 'Amharic'),
        (LANG_OM, 'Afaan Oromo'),
    )

    THEME_LIGHT = 'light'
    THEME_DARK = 'dark'

    THEME_CHOICES = (
        (THEME_LIGHT, 'Light'),
        (THEME_DARK, 'Dark'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_CUSTOMER)
    preferred_language = models.CharField(max_length=5, choices=LANG_CHOICES, default=LANG_EN)
    preferred_theme = models.CharField(max_length=10, choices=THEME_CHOICES, default=THEME_LIGHT)
    phone_number = models.CharField(max_length=20, unique=True, null=True, blank=True)
    is_banned = models.BooleanField(default=False)
    ban_reason = models.TextField(blank=True, default='')
    banned_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_customer(self):
        return self.role == self.ROLE_CUSTOMER

    @property
    def is_professional(self):
        return self.role == self.ROLE_PROFESSIONAL

    @property
    def is_administrator(self):
        return self.role == self.ROLE_ADMIN or self.is_staff or self.is_superuser

    @property
    def profile_picture_url(self):
        if hasattr(self, 'professional_profile') and self.professional_profile.profile_picture:
            return self.professional_profile.profile_picture.url
        elif hasattr(self, 'customer_profile') and self.customer_profile.profile_picture:
            return self.customer_profile.profile_picture.url
        return None

    def clean(self):
        super().clean()
        if self.phone_number:
            self.phone_number = normalize_ethiopian_phone(self.phone_number)

    def save(self, *args, **kwargs):
        if self.phone_number:
            try:
                self.phone_number = normalize_ethiopian_phone(self.phone_number)
            except ValidationError:
                pass
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"


class CustomerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    city = models.ForeignKey('professionals.City', on_delete=models.SET_NULL, null=True, blank=True, related_name='customers')
    subcity = models.ForeignKey('professionals.SubCity', on_delete=models.SET_NULL, null=True, blank=True, related_name='customers')
    address_details = models.CharField(max_length=255, blank=True, default='')
    # Fayda ID is sensitive national identification, never serialized to public APIs
    fayda_id = models.CharField(max_length=64, blank=True, default='')
    profile_picture = models.ImageField(upload_to='profiles/customers/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Customer: {self.user.get_full_name() or self.user.username}"
