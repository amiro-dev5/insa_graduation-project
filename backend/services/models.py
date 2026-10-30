from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

class ServiceRequest(models.Model):
    STATUS_PENDING = 'PENDING'
    STATUS_ACCEPTED = 'ACCEPTED'
    STATUS_IN_PROGRESS = 'IN_PROGRESS'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_CANCELLED = 'CANCELLED'
    STATUS_DECLINED_BY_ALL = 'DECLINED_BY_ALL'

    STATUS_CHOICES = (
        (STATUS_PENDING, 'Pending Professional Acceptance'),
        (STATUS_ACCEPTED, 'Accepted'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
        (STATUS_DECLINED_BY_ALL, 'Declined by All Selected Professionals'),
    )

    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='submitted_service_requests')
    category = models.ForeignKey('professionals.ServiceCategory', on_delete=models.CASCADE, related_name='service_requests')
    city = models.ForeignKey('professionals.City', on_delete=models.CASCADE, related_name='service_requests')
    subcity = models.ForeignKey('professionals.SubCity', on_delete=models.SET_NULL, null=True, blank=True, related_name='service_requests')
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    # Private customer contact location: only exposed to the accepted professional
    service_address = models.CharField(max_length=255)
    preferred_date = models.DateField(null=True, blank=True)
    
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default=STATUS_PENDING)
    accepted_professional = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='accepted_jobs')
    
    cancellation_reason = models.TextField(blank=True, default='')
    cancelled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='cancelled_jobs')
    
    accepted_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Request #{self.id}: {self.title} ({self.status})"


class ServiceRequestRecipient(models.Model):
    STATUS_PENDING = 'PENDING'
    STATUS_ACCEPTED = 'ACCEPTED'
    STATUS_DECLINED = 'DECLINED'
    STATUS_SUPERSEDED = 'SUPERSEDED'
    STATUS_CANCELLED = 'CANCELLED'

    STATUS_CHOICES = (
        (STATUS_PENDING, 'Pending'),
        (STATUS_ACCEPTED, 'Accepted'),
        (STATUS_DECLINED, 'Declined'),
        (STATUS_SUPERSEDED, 'Superseded by Another Professional'),
        (STATUS_CANCELLED, 'Cancelled'),
    )

    request = models.ForeignKey(ServiceRequest, on_delete=models.CASCADE, related_name='recipients')
    professional = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_service_invites')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    declined_reason = models.TextField(blank=True, default='')
    responded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('request', 'professional')
        ordering = ['-created_at']

    def __str__(self):
        return f"Invite for Request #{self.request_id} to {self.professional.get_full_name()} [{self.status}]"
