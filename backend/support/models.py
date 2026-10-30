from django.db import models
from django.conf import settings


class SupportMessage(models.Model):
    """
    Audit log of messages exchanged between FixIt users and the AI Support Assistant.
    Provides session context windowing and support analytics.
    """
    ROLE_CHOICES = (
        ('user', 'User'),
        ('assistant', 'Assistant'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='support_messages'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    message = models.TextField()
    language = models.CharField(max_length=10, default='en')
    is_refusal = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.role} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"
