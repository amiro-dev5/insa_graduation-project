from django.db import models
from django.conf import settings

class Notification(models.Model):
    TYPE_SERVICE_REQUEST = 'SERVICE_REQUEST'
    TYPE_REQUEST_ACCEPTED = 'REQUEST_ACCEPTED'
    TYPE_REQUEST_DECLINED = 'REQUEST_DECLINED'
    TYPE_REQUEST_CANCELLED = 'REQUEST_CANCELLED'
    TYPE_JOB_IN_PROGRESS = 'JOB_IN_PROGRESS'
    TYPE_JOB_COMPLETED = 'JOB_COMPLETED'
    TYPE_REVIEW_RECEIVED = 'REVIEW_RECEIVED'
    TYPE_VERIFICATION_APPROVED = 'VERIFICATION_APPROVED'
    TYPE_VERIFICATION_REJECTED = 'VERIFICATION_REJECTED'
    TYPE_ADMIN_NOTICE = 'ADMIN_NOTICE'

    TYPE_CHOICES = (
        (TYPE_SERVICE_REQUEST, 'New Service Request'),
        (TYPE_REQUEST_ACCEPTED, 'Service Request Accepted'),
        (TYPE_REQUEST_DECLINED, 'Service Request Declined'),
        (TYPE_REQUEST_CANCELLED, 'Service Request Cancelled'),
        (TYPE_JOB_IN_PROGRESS, 'Job In Progress'),
        (TYPE_JOB_COMPLETED, 'Job Completed'),
        (TYPE_REVIEW_RECEIVED, 'New Review Received'),
        (TYPE_VERIFICATION_APPROVED, 'Verification Approved'),
        (TYPE_VERIFICATION_REJECTED, 'Verification Rejected'),
        (TYPE_ADMIN_NOTICE, 'Administrative Notice'),
    )

    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=40, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    related_resource_type = models.CharField(max_length=50, blank=True, default='')  # 'service_request', 'post', 'profile'
    related_resource_id = models.PositiveIntegerField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification to {self.recipient.username}: {self.title}"


def send_notification(recipient, notification_type, title, message, resource_type='', resource_id=None):
    """
    Utility to create persistent database notification for any user.
    """
    return Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        related_resource_type=resource_type,
        related_resource_id=resource_id
    )
