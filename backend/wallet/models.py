from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError


class Wallet(models.Model):
    professional = models.OneToOneField(
        'professionals.ProfessionalProfile',
        on_delete=models.CASCADE,
        related_name='wallet'
    )
    balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    currency = models.CharField(max_length=5, default='ETB')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Professional Wallet'
        verbose_name_plural = 'Professional Wallets'

    def __str__(self):
        user_name = self.professional.user.get_full_name() or self.professional.user.username
        return f"Wallet ({user_name}): {self.balance} {self.currency}"

    def clean(self):
        super().clean()
        if self.balance < Decimal('0.00'):
            raise ValidationError("Wallet balance cannot be negative.")


class WalletTransaction(models.Model):
    TYPE_TOPUP = 'TOPUP'
    TYPE_JOB_FEE = 'JOB_FEE'

    TYPE_CHOICES = (
        (TYPE_TOPUP, 'Wallet Top-Up'),
        (TYPE_JOB_FEE, 'Job Acceptance Fee'),
    )

    STATUS_PENDING = 'PENDING'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_SUCCESS = 'COMPLETED'
    STATUS_FAILED = 'FAILED'
    STATUS_CANCELLED = 'CANCELLED'

    STATUS_CHOICES = (
        (STATUS_PENDING, 'Pending'),
        (STATUS_COMPLETED, 'Completed'),
        ('SUCCESS', 'Success'),
        (STATUS_FAILED, 'Failed'),
        (STATUS_CANCELLED, 'Cancelled'),
    )

    @property
    def is_successful(self):
        return self.status in (self.STATUS_COMPLETED, 'SUCCESS', 'COMPLETED')

    wallet = models.ForeignKey(
        Wallet,
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    transaction_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    balance_after = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True
    )
    reference = models.CharField(max_length=100, unique=True, db_index=True)
    chapa_reference = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    payment_method = models.CharField(max_length=50, blank=True, default='')
    service_request = models.ForeignKey(
        'services.ServiceRequest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='wallet_transactions'
    )
    description = models.CharField(max_length=255, blank=True, default='')
    raw_response = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Wallet Transaction'
        verbose_name_plural = 'Wallet Transactions'

    def __str__(self):
        return f"{self.transaction_type} {self.amount} {self.wallet.currency} - {self.reference} ({self.status})"
