import hmac
import hashlib
import json
import uuid
import urllib.request
import urllib.error
from decimal import Decimal, InvalidOperation
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from .models import Wallet, WalletTransaction


class ChapaError(Exception):
    """Base exception for Chapa integration errors."""
    pass


class ChapaConfigurationError(ChapaError):
    """Raised when Chapa API keys or environment settings are missing or invalid."""
    pass


class ChapaAPIError(ChapaError):
    """Raised when Chapa API returns an error or unexpected response."""
    pass


class ChapaService:
    @staticmethod
    def get_secret_key() -> str:
        key = getattr(settings, 'CHAPA_SECRET_KEY', '')
        return key.strip() if key else ''

    @staticmethod
    def get_base_url() -> str:
        base_url = getattr(settings, 'CHAPA_BASE_URL', 'https://api.chapa.global/v2')
        return base_url.rstrip('/') if base_url else 'https://api.chapa.global/v2'

    @staticmethod
    def get_webhook_secret() -> str:
        secret = getattr(settings, 'CHAPA_WEBHOOK_SECRET', '')
        return secret.strip() if secret else ''

    @classmethod
    def _make_request(cls, endpoint: str, data: dict = None, headers: dict = None, method: str = 'GET', timeout: int = 10):
        req_data = json.dumps(data).encode('utf-8') if data is not None else None
        req = urllib.request.Request(endpoint, data=req_data, headers=headers or {}, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                status_code = resp.status
                res_data = json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            status_code = e.code
            try:
                res_data = json.loads(e.read().decode('utf-8'))
            except Exception:
                res_data = {}
        except urllib.error.URLError as e:
            raise ChapaAPIError(f"Network error communicating with Chapa: {str(e.reason)}")
        except Exception as e:
            raise ChapaAPIError(f"Unexpected error communicating with Chapa: {str(e)}")

        return status_code, res_data

    @classmethod
    def initialize_hosted_payment(cls, wallet: Wallet, user, amount: Decimal, return_url: str = None, callback_url: str = None):
        """
        Validates amount, creates a pending ledger record, and calls Chapa hosted checkout API.
        """
        secret_key = cls.get_secret_key()
        if not secret_key:
            raise ChapaConfigurationError(
                "CHAPA_SECRET_KEY is not configured in backend environment variables. "
                "Please configure CHAPA_SECRET_KEY in your .env file."
            )

        # Validate amount range and precision
        if amount < Decimal('50.00'):
            raise ValueError("Minimum top-up amount is 50.00 ETB.")
        if amount > Decimal('100000.00'):
            raise ValueError("Maximum single top-up amount is 100,000.00 ETB.")

        # Ensure 2 decimal places
        quantized_amount = amount.quantize(Decimal('0.01'))

        merchant_reference = f"FIXIT-TOPUP-{uuid.uuid4().hex[:12].upper()}"

        # Create pending ledger transaction record first
        with transaction.atomic():
            wallet_tx = WalletTransaction.objects.create(
                wallet=wallet,
                transaction_type=WalletTransaction.TYPE_TOPUP,
                amount=quantized_amount,
                balance_after=wallet.balance,  # Pending does not increment balance yet
                status=WalletTransaction.STATUS_PENDING,
                reference=merchant_reference,
                description="Pending wallet top-up via Chapa"
            )

        headers = {
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/json",
            "User-Agent": "FixIt-Backend/1.0"
        }

        # Customer details
        first_name = user.first_name.strip() if user.first_name else user.username
        last_name = user.last_name.strip() if user.last_name else "Professional"
        raw_email = (user.email or '').strip()
        if not raw_email or '@' not in raw_email or raw_email.endswith('.et'):
            email = f"{user.username}@gmail.com"
        else:
            email = raw_email
        phone = (user.phone_number or "+251911000000").replace("+", "").replace(" ", "").replace("-", "")

        payload = {
            "amount": float(quantized_amount),
            "currency": "ETB",
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "phone_number": phone,
            "tx_ref": merchant_reference,
            "merchant_reference": merchant_reference,
            "customer": {
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "phone_number": phone
            }
        }

        if return_url:
            payload["return_url"] = return_url
        if callback_url:
            payload["callback_url"] = callback_url

        status_code = 0
        res_data = {}
        initialization_error = None

        # Try standard Chapa API v1 initialize first (canonical endpoint for CHASECK_TEST keys)
        v1_endpoint = "https://api.chapa.co/v1/transaction/initialize"
        try:
            status_code, res_data = cls._make_request(v1_endpoint, data=payload, headers=headers, method='POST')
        except ChapaAPIError as e:
            initialization_error = str(e)

        # Fallback to v2 hosted checkout endpoint if v1 did not succeed
        if status_code not in (200, 201) or res_data.get('status') != 'success':
            v2_endpoint = f"{cls.get_base_url()}/payments/hosted"
            try:
                v2_code, v2_data = cls._make_request(v2_endpoint, data=payload, headers=headers, method='POST')
                if v2_code in (200, 201) and v2_data.get('status') == 'success':
                    status_code, res_data = v2_code, v2_data
            except ChapaAPIError as e:
                initialization_error = str(e)

        if status_code not in (200, 201) or res_data.get('status') != 'success':
            err_msg = res_data.get('message') or res_data.get('detail') or initialization_error or "Payment initialization failed on Chapa."
            wallet_tx.status = WalletTransaction.STATUS_FAILED
            wallet_tx.description = f"Chapa rejected initialization: {str(err_msg)[:150]}"
            wallet_tx.save(update_fields=['status', 'description', 'updated_at'])
            raise ChapaAPIError(err_msg)

        data = res_data.get('data') or {}
        checkout_url = data.get('checkout_url')
        payment_ref = data.get('payment_reference') or data.get('chapa_reference')

        if not checkout_url:
            wallet_tx.status = WalletTransaction.STATUS_FAILED
            wallet_tx.description = "Chapa response omitted checkout_url"
            wallet_tx.save(update_fields=['status', 'description', 'updated_at'])
            raise ChapaAPIError("Chapa did not return a checkout URL.")

        if payment_ref:
            wallet_tx.chapa_reference = payment_ref
            wallet_tx.save(update_fields=['chapa_reference', 'updated_at'])

        return {
            "checkout_url": checkout_url,
            "merchant_reference": merchant_reference,
            "chapa_reference": payment_ref,
            "amount": float(quantized_amount),
            "currency": "ETB"
        }

    @classmethod
    def verify_payment_on_chapa(cls, reference: str):
        """
        Verifies payment with Chapa using official verification endpoints.
        Tries canonical Chapa API v1 first, then falls back to v2.
        """
        secret_key = cls.get_secret_key()
        if not secret_key:
            raise ChapaConfigurationError("CHAPA_SECRET_KEY is not configured.")

        headers = {
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/json",
            "User-Agent": "FixIt-Backend/1.0"
        }

        # 1. Primary: Standard Chapa API v1 verify endpoint (reliable, fast)
        v1_endpoint = f"https://api.chapa.co/v1/transaction/verify/{reference}"
        try:
            status_code, res_data = cls._make_request(v1_endpoint, headers=headers, method='GET')
            if status_code == 200 and res_data.get('status') == 'success':
                return res_data.get('data', {})
        except Exception:
            pass

        # 2. Secondary fallback: Chapa v2 verify endpoint
        v2_endpoint = f"{cls.get_base_url()}/payments/{reference}/verify"
        try:
            status_code, res_data = cls._make_request(v2_endpoint, headers=headers, method='GET')
            if status_code == 200 and res_data.get('status') == 'success':
                return res_data.get('data', {})
        except Exception:
            pass

        msg = (res_data.get('message') if 'res_data' in locals() and res_data else None) or "Verification failed or transaction not successful on Chapa."
        raise ChapaAPIError(msg)

    @classmethod
    def verify_webhook_signature(cls, raw_body: bytes, signature_header: str) -> bool:
        """
        Verifies HMAC-SHA256 signature from Chapa x-chapa-signature or Chapa-Signature header.
        Uses CHAPA_WEBHOOK_SECRET (configured as Secret Hash in the Chapa Dashboard).
        """
        webhook_secret = cls.get_webhook_secret() or cls.get_secret_key()
        if not webhook_secret or not signature_header:
            return False

        clean_sig = signature_header.strip()

        try:
            # 1. Official Chapa procedure: HMAC-SHA256 of raw body using Secret Hash
            computed = hmac.new(
                webhook_secret.encode('utf-8'),
                raw_body,
                hashlib.sha256
            ).hexdigest()
            if hmac.compare_digest(computed.lower(), clean_sig.lower()):
                return True

            # 2. Fallback: direct secret hash match (if transmitted directly by webhook test tools)
            if hmac.compare_digest(webhook_secret, clean_sig):
                return True

            return False
        except Exception:
            return False

    @classmethod
    def credit_wallet_idempotent(cls, merchant_reference: str, chapa_reference: str = None, verified_amount: Decimal = None, payment_method: str = '', raw_data: dict = None):
        """
        Atomically and idempotently credits a professional's wallet upon verified payment.
        Guarantees that duplicate callbacks, refreshes, or webhooks never credit twice.
        Automatically sets status to COMPLETED without requiring any administrator action.
        """
        with transaction.atomic():
            try:
                tx = WalletTransaction.objects.select_for_update().get(reference=merchant_reference)
            except WalletTransaction.DoesNotExist:
                raise ValueError(f"No transaction found for merchant reference {merchant_reference}")

            # If already credited successfully, return immediately without re-crediting
            if tx.status in (WalletTransaction.STATUS_COMPLETED, 'SUCCESS', 'COMPLETED'):
                return tx, False

            # Verify amount matches pending record
            if verified_amount is not None:
                if Decimal(str(verified_amount)).quantize(Decimal('0.01')) != tx.amount:
                    tx.status = WalletTransaction.STATUS_FAILED
                    tx.description = f"Amount mismatch: expected {tx.amount}, verified {verified_amount}"
                    tx.save(update_fields=['status', 'description', 'updated_at'])
                    raise ValueError(f"Verified amount {verified_amount} does not match expected {tx.amount}")

            # Lock wallet record
            wallet = Wallet.objects.select_for_update().get(id=tx.wallet_id)

            # Credit balance automatically
            wallet.balance += tx.amount
            wallet.save(update_fields=['balance', 'updated_at'])

            # Update transaction record to COMPLETED
            tx.status = WalletTransaction.STATUS_COMPLETED
            tx.balance_after = wallet.balance
            if chapa_reference:
                tx.chapa_reference = chapa_reference
            if payment_method:
                tx.payment_method = payment_method
            if raw_data:
                # Omit any sensitive keys from raw response if present
                safe_raw = {k: v for k, v in raw_data.items() if 'key' not in k.lower() and 'secret' not in k.lower()}
                tx.raw_response = safe_raw
            tx.description = f"Wallet top-up of {tx.amount} ETB via Chapa ({tx.payment_method or 'Hosted Checkout'})"
            tx.save()

            return tx, True
