from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message',
            'related_resource_type', 'related_resource_id',
            'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'notification_type', 'title', 'message', 'related_resource_type', 'related_resource_id', 'created_at']
