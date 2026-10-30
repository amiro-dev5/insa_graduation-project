from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Avg

class Review(models.Model):
    service_request = models.ForeignKey('services.ServiceRequest', on_delete=models.CASCADE, related_name='reviews')
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews_given')
    reviewee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews_received')
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('service_request', 'reviewer')
        ordering = ['-created_at']

    def __str__(self):
        return f"Review #{self.id}: {self.rating} stars from {self.reviewer.username} to {self.reviewee.username}"

    def clean(self):
        super().clean()
        if self.reviewer_id and self.reviewee_id and self.reviewer_id == self.reviewee_id:
            raise ValidationError("A user cannot review or rate their own account.")

    def save(self, *args, **kwargs):
        if self.reviewer_id == self.reviewee_id:
            raise ValidationError("A user cannot review or rate their own account.")
        super().save(*args, **kwargs)
        # If the reviewee is a professional, update their aggregate average rating
        if hasattr(self.reviewee, 'professional_profile'):
            profile = self.reviewee.professional_profile
            avg = Review.objects.filter(reviewee=self.reviewee).exclude(reviewer=self.reviewee).aggregate(Avg('rating'))['rating__avg']
            profile.average_rating = round(avg or 0.0, 2)
            profile.save(update_fields=['average_rating'])
