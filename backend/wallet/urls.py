from django.urls import path
from .views import (
    WalletDetailView,
    WalletTransactionsListView,
    TopUpInitializeView,
    TopUpVerifyView,
    ChapaWebhookView,
    TransactionReceiptView,
    TransactionReceiptHtmlView
)

urlpatterns = [
    path('', WalletDetailView.as_view(), name='wallet-detail'),
    path('transactions/', WalletTransactionsListView.as_view(), name='wallet-transactions'),
    path('topup/initialize/', TopUpInitializeView.as_view(), name='wallet-topup-initialize'),
    path('topup/verify/', TopUpVerifyView.as_view(), name='wallet-topup-verify'),
    path('chapa/webhook/', ChapaWebhookView.as_view(), name='wallet-chapa-webhook'),
    path('transactions/<int:pk>/receipt/', TransactionReceiptView.as_view(), name='wallet-transaction-receipt'),
    path('transactions/<int:pk>/receipt/html/', TransactionReceiptHtmlView.as_view(), name='wallet-transaction-receipt-html'),
]
