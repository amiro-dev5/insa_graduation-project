import hmac
import hashlib
import json
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.contrib.admin.sites import AdminSite
from rest_framework.test import APIClient
from rest_framework import status

from professionals.models import City, SubCity, ServiceCategory, ProfessionalProfile
from services.models import ServiceRequest, ServiceRequestRecipient
from wallet.models import Wallet, WalletTransaction
from wallet.services import ChapaService
from wallet.admin import WalletTransactionAdmin, WalletAdmin

User = get_user_model()


class MockRequest:
    def __init__(self, user):
        self.user = user


class WalletAppTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.city = City.objects.create(name='Addis Ababa')
        self.subcity = SubCity.objects.create(city=self.city, name='Bole')
        self.category = ServiceCategory.objects.create(name='Electrician', slug='electrician')

        # Admin user
        self.admin_user = User.objects.create_superuser(
            username='admin_wallet_test',
            password='Password123!',
            email='admin@fixit.et'
        )

        # Customer user
        self.customer = User.objects.create_user(
            username='cust_wallet_test',
            password='Password123!',
            first_name='Abel',
            last_name='Kebede',
            phone_number='+251911000001',
            role=User.ROLE_CUSTOMER
        )

        # Professional 1
        self.pro1 = User.objects.create_user(
            username='pro_wallet_1',
            password='Password123!',
            first_name='Dawit',
            last_name='Tadesse',
            phone_number='+251922000001',
            role=User.ROLE_PROFESSIONAL
        )
        self.pro1_profile = ProfessionalProfile.objects.create(
            user=self.pro1,
            city=self.city,
            subcity=self.subcity,
            bio='Master Electrician',
            verification_status=ProfessionalProfile.STATUS_APPROVED
        )
        self.pro1_profile.categories.add(self.category)

        # Professional 2
        self.pro2 = User.objects.create_user(
            username='pro_wallet_2',
            password='Password123!',
            first_name='Solomon',
            last_name='Hailu',
            phone_number='+251922000002',
            role=User.ROLE_PROFESSIONAL
        )
        self.pro2_profile = ProfessionalProfile.objects.create(
            user=self.pro2,
            city=self.city,
            subcity=self.subcity,
            bio='Solar Specialist',
            verification_status=ProfessionalProfile.STATUS_APPROVED
        )
        self.pro2_profile.categories.add(self.category)

    # --------------------------------------------------------------------------
    # Scenario 1: Successful verified Chapa payment automatically credits wallet
    #             and reaches COMPLETED status without administrator approval.
    # --------------------------------------------------------------------------
    @override_settings(CHAPA_SECRET_KEY='CHASECK_TEST-mock-key')
    @patch('wallet.services.ChapaService._make_request')
    def test_scenario_1_chapa_verified_credits_wallet_automatically_without_admin_approval(self, mock_make):
        wallet, _ = Wallet.objects.get_or_create(professional=self.pro1_profile)
        ref = 'FIXIT-TOPUP-SCENARIO-1'
        tx = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=WalletTransaction.TYPE_TOPUP,
            amount=Decimal('500.00'),
            balance_after=Decimal('0.00'),
            status=WalletTransaction.STATUS_PENDING,
            reference=ref,
            description='Chapa Top-up'
        )

        mock_make.return_value = (200, {
            'status': 'success',
            'data': {
                'tx_ref': ref,
                'status': 'success',
                'amount': 500.00,
                'currency': 'ETB',
                'reference': 'CHAPA-REF-101',
                'method': 'telebirr'
            }
        })

        self.client.force_authenticate(user=self.pro1)
        res = self.client.post('/api/wallet/topup/verify/', {'reference': ref})

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['wallet_balance'], 500.0)
        self.assertTrue(res.data['was_credited'])

        tx.refresh_from_db()
        self.assertEqual(tx.status, WalletTransaction.STATUS_COMPLETED)
        self.assertTrue(tx.is_successful)
        self.assertEqual(tx.balance_after, Decimal('500.00'))

        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('500.00'))

    # --------------------------------------------------------------------------
    # Scenario 2: Wallet balance updates correctly.
    # --------------------------------------------------------------------------
    @override_settings(CHAPA_SECRET_KEY='CHASECK_TEST-mock-key')
    @patch('wallet.services.ChapaService._make_request')
    def test_scenario_2_wallet_balance_updates_correctly(self, mock_make):
        wallet, _ = Wallet.objects.get_or_create(professional=self.pro1_profile)
        wallet.balance = Decimal('150.00')
        wallet.save(update_fields=['balance'])

        ref = 'FIXIT-TOPUP-SCENARIO-2'
        tx = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=WalletTransaction.TYPE_TOPUP,
            amount=Decimal('250.00'),
            balance_after=Decimal('150.00'),
            status=WalletTransaction.STATUS_PENDING,
            reference=ref
        )

        mock_make.return_value = (200, {
            'status': 'success',
            'data': {
                'tx_ref': ref,
                'status': 'success',
                'amount': 250.00,
                'currency': 'ETB',
                'reference': 'CHAPA-REF-102',
                'method': 'cbebirr'
            }
        })

        self.client.force_authenticate(user=self.pro1)
        res = self.client.post('/api/wallet/topup/verify/', {'reference': ref})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('400.00'))

        tx.refresh_from_db()
        self.assertEqual(tx.balance_after, Decimal('400.00'))
        self.assertEqual(tx.status, WalletTransaction.STATUS_COMPLETED)

    # --------------------------------------------------------------------------
    # Scenario 3: Repeated verification calls do not credit twice (idempotency).
    # --------------------------------------------------------------------------
    @override_settings(CHAPA_SECRET_KEY='CHASECK_TEST-mock-key')
    @patch('wallet.services.ChapaService._make_request')
    def test_scenario_3_repeated_verification_calls_idempotent(self, mock_make):
        wallet, _ = Wallet.objects.get_or_create(professional=self.pro1_profile)
        ref = 'FIXIT-TOPUP-SCENARIO-3'
        tx = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=WalletTransaction.TYPE_TOPUP,
            amount=Decimal('300.00'),
            balance_after=Decimal('0.00'),
            status=WalletTransaction.STATUS_PENDING,
            reference=ref
        )

        mock_make.return_value = (200, {
            'status': 'success',
            'data': {
                'tx_ref': ref,
                'status': 'success',
                'amount': 300.00,
                'currency': 'ETB',
                'reference': 'CHAPA-REF-103',
                'method': 'telebirr'
            }
        })

        self.client.force_authenticate(user=self.pro1)

        # Call 1: Success & Credited
        res1 = self.client.post('/api/wallet/topup/verify/', {'reference': ref})
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('300.00'))

        # Call 2: Returns existing success receipt without double crediting
        res2 = self.client.post('/api/wallet/topup/verify/', {'reference': ref})
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertIn('already verified', res2.data['message'])

        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('300.00'))

    # --------------------------------------------------------------------------
    # Scenario 4: Duplicate webhook events do not credit twice.
    # --------------------------------------------------------------------------
    @override_settings(CHAPA_WEBHOOK_SECRET='test-webhook-secret-4')
    def test_scenario_4_duplicate_webhook_events_do_not_credit_twice(self):
        wallet, _ = Wallet.objects.get_or_create(professional=self.pro1_profile)
        ref = 'FIXIT-TOPUP-SCENARIO-4'
        tx = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=WalletTransaction.TYPE_TOPUP,
            amount=Decimal('200.00'),
            balance_after=Decimal('0.00'),
            status=WalletTransaction.STATUS_PENDING,
            reference=ref
        )

        payload = {
            'event': 'charge.success',
            'tx_ref': ref,
            'reference': 'CHAPA-WH-104',
            'amount': '200.00',
            'currency': 'ETB',
            'payment_method': 'telebirr',
            'status': 'success'
        }
        body_bytes = json.dumps(payload).encode('utf-8')
        sig = hmac.new(b'test-webhook-secret-4', body_bytes, hashlib.sha256).hexdigest()

        # Webhook delivery 1
        res1 = self.client.post(
            '/api/wallet/chapa/webhook/',
            data=body_bytes,
            content_type='application/json',
            HTTP_X_CHAPA_SIGNATURE=sig
        )
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('200.00'))

        # Duplicate Webhook delivery 2
        res2 = self.client.post(
            '/api/wallet/chapa/webhook/',
            data=body_bytes,
            content_type='application/json',
            HTTP_X_CHAPA_SIGNATURE=sig
        )
        self.assertEqual(res2.status_code, status.HTTP_200_OK)

        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('200.00'))

    # --------------------------------------------------------------------------
    # Scenario 5: Automatic pending top-up reconciliation on wallet fetch
    #             (Eliminates transactions waiting for an administrator).
    # --------------------------------------------------------------------------
    @override_settings(CHAPA_SECRET_KEY='CHASECK_TEST-mock-key')
    @patch('wallet.services.ChapaService._make_request')
    def test_scenario_5_auto_reconcile_credits_pending_topup_on_wallet_fetch(self, mock_make):
        wallet, _ = Wallet.objects.get_or_create(professional=self.pro1_profile)
        ref = 'FIXIT-TOPUP-RECONCILE-1'
        tx = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=WalletTransaction.TYPE_TOPUP,
            amount=Decimal('350.00'),
            balance_after=Decimal('0.00'),
            status=WalletTransaction.STATUS_PENDING,
            reference=ref
        )

        mock_make.return_value = (200, {
            'status': 'success',
            'data': {
                'tx_ref': ref,
                'status': 'success',
                'amount': 350.00,
                'currency': 'ETB',
                'reference': 'CHAPA-AUTO-REC',
                'method': 'telebirr'
            }
        })

        self.client.force_authenticate(user=self.pro1)

        # Professional simply fetches their wallet summary (e.g. loads page or clicks refresh)
        res = self.client.get('/api/wallet/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(res.data['balance'])), Decimal('350.00'))

        tx.refresh_from_db()
        self.assertEqual(tx.status, WalletTransaction.STATUS_COMPLETED)
        self.assertEqual(tx.balance_after, Decimal('350.00'))

        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('350.00'))

    # --------------------------------------------------------------------------
    # Scenario 6: Incorrect reference, amount mismatch, or currency mismatch rejected.
    # --------------------------------------------------------------------------
    @override_settings(CHAPA_SECRET_KEY='CHASECK_TEST-mock-key')
    @patch('wallet.services.ChapaService._make_request')
    def test_scenario_6_incorrect_ref_amount_mismatch_and_currency_mismatch(self, mock_make):
        wallet, _ = Wallet.objects.get_or_create(professional=self.pro1_profile)
        self.client.force_authenticate(user=self.pro1)

        # 6a. Non-existent reference returns 404
        res_404 = self.client.post('/api/wallet/topup/verify/', {'reference': 'DOES-NOT-EXIST'})
        self.assertEqual(res_404.status_code, status.HTTP_404_NOT_FOUND)

        # 6b. Currency mismatch (e.g. USD returned instead of ETB)
        ref_curr = 'FIXIT-TOPUP-CURR-MISMATCH'
        tx_curr = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=WalletTransaction.TYPE_TOPUP,
            amount=Decimal('100.00'),
            balance_after=Decimal('0.00'),
            status=WalletTransaction.STATUS_PENDING,
            reference=ref_curr
        )
        mock_make.return_value = (200, {
            'status': 'success',
            'data': {
                'tx_ref': ref_curr,
                'status': 'success',
                'amount': 100.00,
                'currency': 'USD',
                'reference': 'CHAPA-REF-USD'
            }
        })
        res_curr = self.client.post('/api/wallet/topup/verify/', {'reference': ref_curr})
        self.assertEqual(res_curr.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res_curr.data['error_code'], 'INVALID_CURRENCY')
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('0.00'))

        # 6c. Amount mismatch (e.g. expected 500 ETB, Chapa returned 100 ETB)
        ref_amt = 'FIXIT-TOPUP-AMT-MISMATCH'
        tx_amt = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=WalletTransaction.TYPE_TOPUP,
            amount=Decimal('500.00'),
            balance_after=Decimal('0.00'),
            status=WalletTransaction.STATUS_PENDING,
            reference=ref_amt
        )
        mock_make.return_value = (200, {
            'status': 'success',
            'data': {
                'tx_ref': ref_amt,
                'status': 'success',
                'amount': 100.00,
                'currency': 'ETB',
                'reference': 'CHAPA-REF-AMT'
            }
        })
        res_amt = self.client.post('/api/wallet/topup/verify/', {'reference': ref_amt})
        self.assertEqual(res_amt.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res_amt.data['error_code'], 'AMOUNT_MISMATCH')
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('0.00'))

    # --------------------------------------------------------------------------
    # Scenario 7: Failed, cancelled, and pending payments do not credit wallet.
    # --------------------------------------------------------------------------
    @override_settings(CHAPA_SECRET_KEY='CHASECK_TEST-mock-key')
    @patch('wallet.services.ChapaService._make_request')
    def test_scenario_7_failed_cancelled_and_pending_payments_do_not_credit(self, mock_make):
        wallet, _ = Wallet.objects.get_or_create(professional=self.pro1_profile)
        self.client.force_authenticate(user=self.pro1)

        # 7a. Pending status from Chapa
        ref_pend = 'FIXIT-TOPUP-PENDING'
        tx_pend = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=WalletTransaction.TYPE_TOPUP,
            amount=Decimal('200.00'),
            balance_after=Decimal('0.00'),
            status=WalletTransaction.STATUS_PENDING,
            reference=ref_pend
        )
        mock_make.return_value = (200, {
            'status': 'success',
            'data': {
                'tx_ref': ref_pend,
                'status': 'pending',
                'amount': 200.00,
                'currency': 'ETB'
            }
        })
        res_pend = self.client.post('/api/wallet/topup/verify/', {'reference': ref_pend})
        self.assertEqual(res_pend.status_code, status.HTTP_200_OK)
        self.assertEqual(res_pend.data['status'], 'PENDING')
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('0.00'))
        tx_pend.refresh_from_db()
        self.assertEqual(tx_pend.status, WalletTransaction.STATUS_PENDING)

        # 7b. Failed status from Chapa
        ref_fail = 'FIXIT-TOPUP-FAILED'
        tx_fail = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=WalletTransaction.TYPE_TOPUP,
            amount=Decimal('200.00'),
            balance_after=Decimal('0.00'),
            status=WalletTransaction.STATUS_PENDING,
            reference=ref_fail
        )
        mock_make.return_value = (200, {
            'status': 'success',
            'data': {
                'tx_ref': ref_fail,
                'status': 'failed',
                'amount': 200.00,
                'currency': 'ETB'
            }
        })
        res_fail = self.client.post('/api/wallet/topup/verify/', {'reference': ref_fail})
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('0.00'))
        tx_fail.refresh_from_db()
        self.assertEqual(tx_fail.status, WalletTransaction.STATUS_FAILED)

        # 7c. Cancelled status from Chapa
        ref_canc = 'FIXIT-TOPUP-CANCELLED'
        tx_canc = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=WalletTransaction.TYPE_TOPUP,
            amount=Decimal('200.00'),
            balance_after=Decimal('0.00'),
            status=WalletTransaction.STATUS_PENDING,
            reference=ref_canc
        )
        mock_make.return_value = (200, {
            'status': 'success',
            'data': {
                'tx_ref': ref_canc,
                'status': 'cancelled',
                'amount': 200.00,
                'currency': 'ETB'
            }
        })
        res_canc = self.client.post('/api/wallet/topup/verify/', {'reference': ref_canc})
        self.assertEqual(res_canc.status_code, status.HTTP_400_BAD_REQUEST)
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('0.00'))
        tx_canc.refresh_from_db()
        self.assertEqual(tx_canc.status, WalletTransaction.STATUS_CANCELLED)

    # --------------------------------------------------------------------------
    # Scenario 8: User cannot verify or credit another professional's wallet.
    # --------------------------------------------------------------------------
    def test_scenario_8_user_cannot_verify_another_professionals_wallet(self):
        w2, _ = Wallet.objects.get_or_create(professional=self.pro2_profile)
        tx_pro2 = WalletTransaction.objects.create(
            wallet=w2,
            transaction_type=WalletTransaction.TYPE_TOPUP,
            amount=Decimal('300.00'),
            balance_after=Decimal('0.00'),
            status=WalletTransaction.STATUS_PENDING,
            reference='TX-PRO2-EXCLUSIVE'
        )

        # Pro 1 tries to verify Pro 2's transaction reference
        self.client.force_authenticate(user=self.pro1)
        res = self.client.post('/api/wallet/topup/verify/', {'reference': 'TX-PRO2-EXCLUSIVE'})

        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(res.data['error_code'], 'FORBIDDEN')

        w1, _ = Wallet.objects.get_or_create(professional=self.pro1_profile)
        w1.refresh_from_db()
        w2.refresh_from_db()
        self.assertEqual(w1.balance, Decimal('0.00'))
        self.assertEqual(w2.balance, Decimal('0.00'))

    # --------------------------------------------------------------------------
    # Scenario 9: Receipts only available after successful verification.
    # --------------------------------------------------------------------------
    def test_scenario_9_receipt_available_only_after_successful_verification(self):
        wallet, _ = Wallet.objects.get_or_create(professional=self.pro1_profile)
        tx = WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type=WalletTransaction.TYPE_TOPUP,
            amount=Decimal('150.00'),
            balance_after=Decimal('0.00'),
            status=WalletTransaction.STATUS_PENDING,
            reference='TX-RCP-TEST'
        )

        self.client.force_authenticate(user=self.pro1)

        # While pending: receipt must be rejected with 400
        res_rcp_pend = self.client.get(f'/api/wallet/transactions/{tx.id}/receipt/')
        self.assertEqual(res_rcp_pend.status_code, status.HTTP_400_BAD_REQUEST)

        res_html_pend = self.client.get(f'/api/wallet/transactions/{tx.id}/receipt/html/')
        self.assertEqual(res_html_pend.status_code, status.HTTP_400_BAD_REQUEST)

        # Mark transaction completed
        tx.status = WalletTransaction.STATUS_COMPLETED
        tx.balance_after = Decimal('150.00')
        tx.save(update_fields=['status', 'balance_after'])

        # Now receipt should be returned successfully
        res_rcp_ok = self.client.get(f'/api/wallet/transactions/{tx.id}/receipt/')
        self.assertEqual(res_rcp_ok.status_code, status.HTTP_200_OK)
        self.assertEqual(res_rcp_ok.data['receipt_number'], f"RCP-{tx.id:06d}")
        self.assertEqual(Decimal(str(res_rcp_ok.data['amount'])), Decimal('150.00'))

        res_html_ok = self.client.get(f'/api/wallet/transactions/{tx.id}/receipt/html/')
        self.assertEqual(res_html_ok.status_code, status.HTTP_200_OK)
        self.assertIn(b'FixIt Ethiopia', res_html_ok.content)
        self.assertIn(b'Payment Verified', res_html_ok.content)

    # --------------------------------------------------------------------------
    # Scenario 10: 50 ETB job acceptance fee remains functional and deducted once.
    # --------------------------------------------------------------------------
    def test_scenario_10_job_acceptance_fee_deduction(self):
        wallet, _ = Wallet.objects.get_or_create(professional=self.pro1_profile)
        wallet.balance = Decimal('100.00')
        wallet.save(update_fields=['balance'])

        service_req = ServiceRequest.objects.create(
            customer=self.customer,
            category=self.category,
            city=self.city,
            subcity=self.subcity,
            title='Wiring repair',
            description='Short circuit in living room',
            service_address='Bole Atlas, Apt 4B',
            status=ServiceRequest.STATUS_PENDING
        )

        ServiceRequestRecipient.objects.create(
            request=service_req,
            professional=self.pro1,
            status=ServiceRequestRecipient.STATUS_PENDING
        )

        self.client.force_authenticate(user=self.pro1)

        # Accept job request: 50 ETB fee deducted atomically
        res_accept = self.client.post(f'/api/services/professional/requests/{service_req.id}/accept/')
        self.assertEqual(res_accept.status_code, status.HTTP_200_OK)

        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('50.00'))

        # Check job fee ledger record
        fee_tx = WalletTransaction.objects.get(
            wallet=wallet,
            service_request=service_req,
            transaction_type=WalletTransaction.TYPE_JOB_FEE
        )
        self.assertEqual(fee_tx.amount, Decimal('-50.00'))
        self.assertTrue(fee_tx.is_successful)

        # Accepting again should not deduct fee again
        res_accept_again = self.client.post(f'/api/services/professional/requests/{service_req.id}/accept/')
        self.assertEqual(res_accept_again.status_code, status.HTTP_200_OK)
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal('50.00'))

    # --------------------------------------------------------------------------
    # Scenario 11: Customers cannot access wallet endpoints (403 Forbidden).
    # --------------------------------------------------------------------------
    def test_scenario_11_customer_forbidden_from_wallet_endpoints(self):
        self.client.force_authenticate(user=self.customer)

        res_detail = self.client.get('/api/wallet/')
        self.assertEqual(res_detail.status_code, status.HTTP_403_FORBIDDEN)

        res_tx = self.client.get('/api/wallet/transactions/')
        self.assertEqual(res_tx.status_code, status.HTTP_403_FORBIDDEN)

        res_init = self.client.post('/api/wallet/topup/initialize/', {'amount': 100})
        self.assertEqual(res_init.status_code, status.HTTP_403_FORBIDDEN)

        res_verify = self.client.post('/api/wallet/topup/verify/', {'reference': 'SOME-REF'})
        self.assertEqual(res_verify.status_code, status.HTTP_403_FORBIDDEN)

    # --------------------------------------------------------------------------
    # Scenario 12: Manual admin approval workflow is completely disabled
    #              in Django Admin (no add/change/delete or manual approval actions).
    # --------------------------------------------------------------------------
    def test_scenario_12_no_manual_admin_approval_in_django_admin(self):
        admin_site = AdminSite()
        tx_admin = WalletTransactionAdmin(WalletTransaction, admin_site)
        wallet_admin = WalletAdmin(Wallet, admin_site)
        req = MockRequest(self.admin_user)

        # Administrators cannot manually add or alter wallet transactions
        self.assertFalse(tx_admin.has_add_permission(req))
        self.assertFalse(tx_admin.has_change_permission(req))
        self.assertFalse(tx_admin.has_delete_permission(req))
        self.assertIsNone(tx_admin.actions)

        # Administrators cannot manually add or delete wallets
        self.assertFalse(wallet_admin.has_add_permission(req))
        self.assertFalse(wallet_admin.has_delete_permission(req))
