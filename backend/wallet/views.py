import json
from decimal import Decimal, InvalidOperation
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.utils.html import escape
from django.conf import settings
from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Wallet, WalletTransaction
from .serializers import (
    WalletSerializer,
    WalletTransactionSerializer,
    TopUpInitializeSerializer,
    TopUpVerifySerializer,
    ReceiptSerializer
)
from .services import ChapaService, ChapaError, ChapaConfigurationError, ChapaAPIError


class IsProfessionalUser(permissions.BasePermission):
    """
    Allows access only to authenticated professionals with a valid professional profile.
    Customers and unauthenticated users are strictly prohibited.
    Manual administrator approval is completely removed; transactions are automated.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return (
            getattr(request.user, 'role', '') == 'PROFESSIONAL' and
            hasattr(request.user, 'professional_profile')
        )


def auto_reconcile_pending_topups(wallet):
    """
    Automatically checks and completes any pending Chapa top-up transactions for this wallet.
    Eliminates any manual admin approval workflow by reconciling directly with Chapa.
    """
    pending_txs = list(wallet.transactions.filter(
        status=WalletTransaction.STATUS_PENDING,
        transaction_type=WalletTransaction.TYPE_TOPUP
    ).order_by('-created_at')[:5])

    for tx in pending_txs:
        try:
            chapa_data = ChapaService.verify_payment_on_chapa(tx.reference)
            pay_status = (chapa_data.get('status') or '').lower()
            if pay_status in ('success', 'successful'):
                currency = chapa_data.get('currency', 'ETB')
                if currency == 'ETB':
                    verified_amount = Decimal(str(chapa_data.get('amount')))
                    if verified_amount == tx.amount:
                        ChapaService.credit_wallet_idempotent(
                            merchant_reference=tx.reference,
                            chapa_reference=chapa_data.get('reference') or chapa_data.get('payment_reference'),
                            verified_amount=verified_amount,
                            payment_method=chapa_data.get('method') or '',
                            raw_data=chapa_data
                        )
            elif pay_status in ('failed', 'cancelled'):
                tx.status = WalletTransaction.STATUS_CANCELLED if pay_status == 'cancelled' else WalletTransaction.STATUS_FAILED
                tx.save(update_fields=['status', 'updated_at'])
        except Exception:
            # Tolerant if Chapa API is temporarily unreachable during background reconcile
            pass


class WalletDetailView(APIView):
    permission_classes = [IsProfessionalUser]

    def get(self, request):
        pro_profile = request.user.professional_profile
        wallet, _ = Wallet.objects.get_or_create(professional=pro_profile)
        # Automatically verify and complete any pending Chapa top-ups without admin intervention
        auto_reconcile_pending_topups(wallet)
        wallet.refresh_from_db()
        serializer = WalletSerializer(wallet)
        return Response(serializer.data, status=status.HTTP_200_OK)


class WalletTransactionsListView(APIView):
    permission_classes = [IsProfessionalUser]

    def get(self, request):
        pro_profile = request.user.professional_profile
        wallet, _ = Wallet.objects.get_or_create(professional=pro_profile)
        # Automatically verify and complete any pending Chapa top-ups without admin intervention
        auto_reconcile_pending_topups(wallet)
        wallet.refresh_from_db()

        qs = wallet.transactions.all().select_related('service_request')

        filter_type = request.query_params.get('type', 'all').lower()
        if filter_type == 'topup':
            qs = qs.filter(transaction_type=WalletTransaction.TYPE_TOPUP)
        elif filter_type == 'fee':
            qs = qs.filter(transaction_type=WalletTransaction.TYPE_JOB_FEE)

        serializer = WalletTransactionSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TopUpInitializeView(APIView):
    permission_classes = [IsProfessionalUser]

    def post(self, request):
        serializer = TopUpInitializeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        amount = serializer.validated_data['amount']
        return_url = serializer.validated_data.get('return_url')

        pro_profile = request.user.professional_profile
        wallet, _ = Wallet.objects.get_or_create(professional=pro_profile)

        # Default callback and return URLs if not provided
        callback_url = request.build_absolute_uri('/api/wallet/chapa/webhook/')
        if not return_url:
            # Frontend return path
            return_url = f"http://localhost:5173/professional/wallet"

        try:
            init_data = ChapaService.initialize_hosted_payment(
                wallet=wallet,
                user=request.user,
                amount=amount,
                return_url=return_url,
                callback_url=callback_url
            )
            return Response(init_data, status=status.HTTP_201_CREATED)
        except ChapaConfigurationError as e:
            return Response(
                {
                    'error_code': 'CHAPA_CONFIG_ERROR',
                    'detail': str(e)
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except (ValueError, ChapaAPIError) as e:
            return Response(
                {
                    'error_code': 'INITIALIZATION_FAILED',
                    'detail': str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )


class TopUpVerifyView(APIView):
    permission_classes = [IsProfessionalUser]

    def post(self, request):
        serializer = TopUpVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reference = serializer.validated_data['reference']
        chapa_ref = serializer.validated_data.get('chapa_reference')

        pro_profile = request.user.professional_profile
        wallet, _ = Wallet.objects.get_or_create(professional=pro_profile)

        # Check if transaction exists at all
        existing_tx = WalletTransaction.objects.filter(
            Q(reference=reference) | Q(chapa_reference=reference)
        ).first()

        if not existing_tx and chapa_ref:
            existing_tx = WalletTransaction.objects.filter(
                Q(reference=chapa_ref) | Q(chapa_reference=chapa_ref)
            ).first()

        if not existing_tx:
            return Response(
                {'error_code': 'NOT_FOUND', 'detail': 'Transaction not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Enforce wallet ownership: user cannot verify another professional's transaction
        if existing_tx.wallet_id != wallet.id:
            return Response(
                {'error_code': 'FORBIDDEN', 'detail': 'You are not authorized to verify another professional\'s transaction.'},
                status=status.HTTP_403_FORBIDDEN
            )

        tx = existing_tx

        # If already success, return receipt without re-crediting
        if tx.is_successful:
            return Response({
                'message': 'Payment already verified and credited.',
                'wallet_balance': float(wallet.balance),
                'transaction': WalletTransactionSerializer(tx).data,
                'receipt': self._build_receipt(tx, request.user)
            }, status=status.HTTP_200_OK)

        # Call Chapa verification API using FixIt merchant reference (tx.reference is tx_ref)
        lookup_ref = tx.reference
        try:
            chapa_data = ChapaService.verify_payment_on_chapa(lookup_ref)
        except ChapaConfigurationError as e:
            return Response({'error_code': 'CHAPA_CONFIG_ERROR', 'detail': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ChapaAPIError as e:
            return Response({'error_code': 'VERIFICATION_FAILED', 'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Inspect payment status returned by Chapa
        payment_status = (chapa_data.get('status') or '').lower()
        if payment_status == 'pending':
            return Response({
                'status': 'PENDING',
                'message': 'Payment is still processing on Chapa. Please complete your payment.',
                'wallet_balance': float(wallet.balance),
                'transaction': WalletTransactionSerializer(tx).data
            }, status=status.HTTP_200_OK)
        elif payment_status in ('failed', 'cancelled'):
            tx.status = WalletTransaction.STATUS_CANCELLED if payment_status == 'cancelled' else WalletTransaction.STATUS_FAILED
            tx.description = f"Chapa payment status: {payment_status}"
            tx.save(update_fields=['status', 'description', 'updated_at'])
            return Response({
                'error_code': 'PAYMENT_FAILED',
                'status': tx.status,
                'detail': f"Payment was {payment_status} on Chapa."
            }, status=status.HTTP_400_BAD_REQUEST)
        elif payment_status not in ('success', 'successful'):
            return Response({
                'error_code': 'UNCONFIRMED_PAYMENT',
                'detail': f"Chapa reported unexpected payment status: {payment_status}"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Verify currency and amount
        currency = chapa_data.get('currency', 'ETB')
        if currency != 'ETB':
            tx.status = WalletTransaction.STATUS_FAILED
            tx.description = f"Invalid currency returned: {currency}"
            tx.save(update_fields=['status', 'description', 'updated_at'])
            return Response({'error_code': 'INVALID_CURRENCY', 'detail': 'Transaction currency must be ETB.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            verified_amount = Decimal(str(chapa_data.get('amount')))
        except (TypeError, InvalidOperation):
            tx.status = WalletTransaction.STATUS_FAILED
            tx.description = "Chapa response returned invalid amount format"
            tx.save(update_fields=['status', 'description', 'updated_at'])
            return Response({'error_code': 'INVALID_AMOUNT', 'detail': 'Chapa response contained an invalid amount.'}, status=status.HTTP_400_BAD_REQUEST)

        if verified_amount != tx.amount:
            tx.status = WalletTransaction.STATUS_FAILED
            tx.description = f"Amount mismatch: expected {tx.amount}, received {verified_amount}"
            tx.save(update_fields=['status', 'description', 'updated_at'])
            return Response({'error_code': 'AMOUNT_MISMATCH', 'detail': f"Verified amount ({verified_amount}) does not match expected ({tx.amount})."}, status=status.HTTP_400_BAD_REQUEST)

        verified_chapa_ref = chapa_data.get('chapa_reference') or chapa_data.get('payment_reference') or lookup_ref
        payment_method = chapa_data.get('payment_method') or chapa_data.get('method') or ''

        # Idempotently credit wallet
        try:
            credited_tx, was_credited = ChapaService.credit_wallet_idempotent(
                merchant_reference=tx.reference,
                chapa_reference=verified_chapa_ref,
                verified_amount=verified_amount,
                payment_method=payment_method,
                raw_data=chapa_data
            )
        except ValueError as e:
            return Response({'error_code': 'CREDIT_ERROR', 'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        wallet.refresh_from_db()

        return Response({
            'message': 'Payment successfully verified and wallet credited.',
            'wallet_balance': float(wallet.balance),
            'was_credited': was_credited,
            'transaction': WalletTransactionSerializer(credited_tx).data,
            'receipt': self._build_receipt(credited_tx, request.user)
        }, status=status.HTTP_200_OK)

    def _build_receipt(self, tx: WalletTransaction, user):
        pro_name = user.get_full_name() or user.username
        pro_phone = user.phone_number or ''
        return {
            'receipt_number': f"RCP-{tx.id:06d}",
            'professional_name': pro_name,
            'professional_phone': pro_phone,
            'amount': float(tx.amount),
            'currency': tx.wallet.currency,
            'date': tx.created_at,
            'chapa_reference': tx.chapa_reference,
            'merchant_reference': tx.reference,
            'payment_method': tx.payment_method or 'Chapa Hosted Checkout',
            'status': 'Successful',
            'note': 'This official receipt confirms a verified top-up to your FixIt professional service wallet.'
        }


class ChapaWebhookView(APIView):
    """
    Public webhook endpoint receiving real-time payment notifications from Chapa.
    Verifies x-chapa-signature HMAC-SHA256 signature before processing.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        signature = (
            request.headers.get('x-chapa-signature') or
            request.headers.get('Chapa-Signature') or
            request.META.get('HTTP_X_CHAPA_SIGNATURE') or
            request.META.get('HTTP_CHAPA_SIGNATURE') or
            ''
        )

        # Validate signature
        is_valid = ChapaService.verify_webhook_signature(request.body, signature)
        if not is_valid:
            if settings.DEBUG and not getattr(settings, 'CHAPA_WEBHOOK_SECRET', ''):
                pass
            else:
                return Response({'detail': 'Invalid webhook signature.'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            payload = json.loads(request.body.decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            return Response({'detail': 'Malformed JSON payload.'}, status=status.HTTP_400_BAD_REQUEST)

        # Chapa webhooks deliver event payload
        event_status = (payload.get('status') or '').lower()
        merchant_ref = (
            payload.get('merchant_reference') or
            payload.get('tx_ref') or
            payload.get('reference')
        )
        chapa_ref = payload.get('chapa_reference') or payload.get('payment_reference')
        payment_method = payload.get('payment_method') or payload.get('method') or ''

        if not merchant_ref:
            return Response({'detail': 'Webhook payload missing reference.'}, status=status.HTTP_200_OK)

        if event_status == 'pending':
            return Response({'status': 'pending'}, status=status.HTTP_200_OK)
        elif event_status not in ('success', 'successful'):
            # Mark transaction as failed/cancelled if found and pending
            WalletTransaction.objects.filter(reference=merchant_ref, status=WalletTransaction.STATUS_PENDING).update(
                status=WalletTransaction.STATUS_CANCELLED if event_status == 'cancelled' else WalletTransaction.STATUS_FAILED,
                description=f"Webhook indicated payment status: {event_status}"
            )
            return Response({'status': f'ignored_{event_status}'}, status=status.HTTP_200_OK)

        currency = payload.get('currency', 'ETB')
        if currency != 'ETB':
            return Response({'status': 'invalid_currency'}, status=status.HTTP_400_BAD_REQUEST)

        raw_amount = payload.get('amount')
        verified_amount = None
        if raw_amount is not None:
            try:
                verified_amount = Decimal(str(raw_amount))
            except (TypeError, InvalidOperation):
                pass

        try:
            ChapaService.credit_wallet_idempotent(
                merchant_reference=merchant_ref,
                chapa_reference=chapa_ref,
                verified_amount=verified_amount,
                payment_method=payment_method,
                raw_data=payload
            )
        except ValueError:
            pass

        return Response({'status': 'processed'}, status=status.HTTP_200_OK)


class TransactionReceiptView(APIView):
    permission_classes = [IsProfessionalUser]

    def get(self, request, pk):
        pro_profile = request.user.professional_profile
        wallet, _ = Wallet.objects.get_or_create(professional=pro_profile)

        tx = get_object_or_404(
            WalletTransaction.objects.select_related('wallet__professional__user'),
            pk=pk,
            wallet=wallet
        )

        if tx.transaction_type != WalletTransaction.TYPE_TOPUP or not tx.is_successful:
            return Response(
                {'detail': 'Receipt is only available for successful wallet top-up transactions.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = tx.wallet.professional.user
        receipt_data = {
            'receipt_number': f"RCP-{tx.id:06d}",
            'professional_name': user.get_full_name() or user.username,
            'professional_phone': user.phone_number or '',
            'amount': float(tx.amount),
            'currency': tx.wallet.currency,
            'date': tx.created_at,
            'chapa_reference': tx.chapa_reference,
            'merchant_reference': tx.reference,
            'payment_method': tx.payment_method or 'Chapa Hosted Checkout',
            'status': 'Successful',
            'note': 'This official receipt confirms a verified top-up to your FixIt professional service wallet.'
        }

        serializer = ReceiptSerializer(receipt_data)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TransactionReceiptHtmlView(APIView):
    """
    Returns an official, print-ready HTML receipt suitable for saving to PDF or printing.
    """
    permission_classes = [IsProfessionalUser]

    def get(self, request, pk):
        pro_profile = request.user.professional_profile
        wallet, _ = Wallet.objects.get_or_create(professional=pro_profile)

        tx = get_object_or_404(
            WalletTransaction.objects.select_related('wallet__professional__user'),
            pk=pk,
            wallet=wallet
        )

        if tx.transaction_type != WalletTransaction.TYPE_TOPUP or not tx.is_successful:
            return HttpResponse("Receipt is only available for verified successful top-ups.", status=400)

        user = tx.wallet.professional.user
        pro_name = escape(user.get_full_name() or user.username)
        pro_phone = escape(user.phone_number or 'N/A')
        date_str = tx.created_at.strftime("%B %d, %Y - %I:%M %p")
        amount_str = f"{tx.amount:,.2f}"
        ref_str = escape(tx.reference)
        chapa_ref_str = escape(tx.chapa_reference or 'N/A')
        method_str = escape(tx.payment_method or 'Chapa Hosted Checkout')
        rcp_num = f"RCP-{tx.id:06d}"

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt {rcp_num} - FixIt Ethiopia</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px;
      color: #0f172a;
      background: #f8fafc;
    }}
    .receipt-container {{
      max-width: 650px;
      margin: 0 auto;
      background: #ffffff;
      padding: 36px;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }}
    .header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }}
    .brand {{
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }}
    .brand span {{
      color: #4f46e5;
    }}
    .badge {{
      display: inline-block;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 700;
      color: #065f46;
      background: #d1fae5;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .details-table {{
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }}
    .details-table td {{
      padding: 10px 0;
      font-size: 13px;
      border-bottom: 1px solid #f1f5f9;
    }}
    .details-table td.label {{
      color: #64748b;
      font-weight: 500;
      width: 40%;
    }}
    .details-table td.val {{
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }}
    .amount-box {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px;
      text-align: center;
      margin: 24px 0;
    }}
    .amount-label {{
      font-size: 11px;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 1px;
      font-weight: 700;
    }}
    .amount-val {{
      font-size: 28px;
      font-weight: 800;
      color: #4f46e5;
      margin-top: 4px;
    }}
    .footer-note {{
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
      line-height: 1.5;
      margin-top: 24px;
    }}
    .print-btn {{
      display: block;
      width: 100%;
      padding: 12px;
      background: #4f46e5;
      color: white;
      text-align: center;
      border: none;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 20px;
    }}
    @media print {{
      body {{ background: #ffffff; padding: 0; }}
      .receipt-container {{ border: none; box-shadow: none; padding: 20px; }}
      .print-btn {{ display: none; }}
    }}
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="brand">Fix<span>It</span></div>
      <div class="badge">Payment Verified</div>
    </div>

    <div class="amount-box">
      <div class="amount-label">Verified Top-Up Amount</div>
      <div class="amount-val">{amount_str} ETB</div>
    </div>

    <table class="details-table">
      <tr>
        <td class="label">Receipt Number</td>
        <td class="val">{rcp_num}</td>
      </tr>
      <tr>
        <td class="label">Professional Name</td>
        <td class="val">{pro_name}</td>
      </tr>
      <tr>
        <td class="label">Phone Number</td>
        <td class="val">{pro_phone}</td>
      </tr>
      <tr>
        <td class="label">Date & Time</td>
        <td class="val">{date_str}</td>
      </tr>
      <tr>
        <td class="label">Payment Gateway</td>
        <td class="val">Chapa Hosted Checkout (Test Mode)</td>
      </tr>
      <tr>
        <td class="label">Payment Method</td>
        <td class="val">{method_str}</td>
      </tr>
      <tr>
        <td class="label">Merchant Reference</td>
        <td class="val">{ref_str}</td>
      </tr>
      <tr>
        <td class="label">Chapa Reference</td>
        <td class="val">{chapa_ref_str}</td>
      </tr>
      <tr>
        <td class="label">Status</td>
        <td class="val" style="color: #059669;">Successful (Credited)</td>
      </tr>
    </table>

    <div class="footer-note">
      This is an electronically issued transaction receipt from FixIt Ethiopia.<br>
      Funds have been credited directly to your Professional Service Wallet.
    </div>

    <button class="print-btn" onclick="window.print()">Print or Save as PDF</button>
  </div>
</body>
</html>"""
        return HttpResponse(html_content, content_type="text/html")
