from decimal import Decimal
from rest_framework import serializers
from .models import Wallet, WalletTransaction


class WalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wallet
        fields = ['id', 'balance', 'currency', 'created_at', 'updated_at']
        read_only_fields = ['id', 'balance', 'currency', 'created_at', 'updated_at']


class WalletTransactionSerializer(serializers.ModelSerializer):
    service_request_title = serializers.SerializerMethodField()
    receipt_available = serializers.SerializerMethodField()

    class Meta:
        model = WalletTransaction
        fields = [
            'id', 'transaction_type', 'amount', 'balance_after', 'status',
            'reference', 'chapa_reference', 'payment_method',
            'service_request', 'service_request_title', 'description',
            'created_at', 'receipt_available'
        ]
        read_only_fields = fields

    def get_service_request_title(self, obj):
        if obj.service_request:
            return obj.service_request.title
        return None

    def get_receipt_available(self, obj):
        return obj.transaction_type == WalletTransaction.TYPE_TOPUP and obj.is_successful


class TopUpInitializeSerializer(serializers.Serializer):
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal('50.00'),
        max_value=Decimal('100000.00'),
        required=True
    )
    return_url = serializers.CharField(max_length=500, required=False, allow_blank=True)


class TopUpVerifySerializer(serializers.Serializer):
    reference = serializers.CharField(max_length=100, required=True)
    chapa_reference = serializers.CharField(max_length=100, required=False, allow_blank=True)


class ReceiptSerializer(serializers.Serializer):
    receipt_number = serializers.CharField()
    professional_name = serializers.CharField()
    professional_phone = serializers.CharField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    currency = serializers.CharField()
    date = serializers.DateTimeField()
    chapa_reference = serializers.CharField(allow_null=True)
    merchant_reference = serializers.CharField()
    payment_method = serializers.CharField()
    status = serializers.CharField()
    note = serializers.CharField()
