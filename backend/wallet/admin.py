from django.contrib import admin
from .models import Wallet, WalletTransaction


class WalletTransactionInline(admin.TabularInline):
    model = WalletTransaction
    extra = 0
    readonly_fields = [
        'transaction_type', 'amount', 'balance_after', 'status',
        'reference', 'chapa_reference', 'payment_method',
        'service_request', 'created_at'
    ]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ['id', 'professional', 'balance', 'currency', 'updated_at']
    list_filter = ['currency']
    search_fields = ['professional__user__username', 'professional__user__first_name', 'professional__user__last_name']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [WalletTransactionInline]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    """
    Wallet transactions are processed automatically via Chapa payment gateway.
    Manual admin approval, rejection, or status editing is strictly disabled.
    """
    list_display = ['id', 'wallet', 'transaction_type', 'amount', 'balance_after', 'status', 'reference', 'chapa_reference', 'created_at']
    list_filter = ['transaction_type', 'status', 'created_at']
    search_fields = ['reference', 'chapa_reference', 'wallet__professional__user__username']
    readonly_fields = [
        'id', 'wallet', 'transaction_type', 'amount', 'balance_after',
        'status', 'reference', 'chapa_reference', 'payment_method',
        'service_request', 'description', 'raw_response', 'created_at', 'updated_at'
    ]
    actions = None

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
