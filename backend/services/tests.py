from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile

from professionals.models import City, SubCity, ServiceCategory, ProfessionalProfile, ProfessionalCertificate
from services.models import ServiceRequest, ServiceRequestRecipient
from notifications.models import Notification
from reviews.models import Review
from wallet.models import Wallet, WalletTransaction

User = get_user_model()

class ServiceRequestWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.city = City.objects.create(name='Addis Ababa')
        self.subcity = SubCity.objects.create(city=self.city, name='Bole')
        self.category = ServiceCategory.objects.create(name='Plumbing', slug='plumbing')

        # Customer
        self.customer = User.objects.create_user(
            username='cust_almaz',
            password='Password123!',
            first_name='Almaz',
            last_name='Ayele',
            phone_number='+251911111111',
            role=User.ROLE_CUSTOMER
        )

        # 4 Approved Professionals
        self.pros = []
        for i in range(4):
            user = User.objects.create_user(
                username=f'pro_{i}',
                password='Password123!',
                first_name=f'ProFirstName_{i}',
                last_name=f'ProLastName_{i}',
                phone_number=f'+25192222222{i}',
                role=User.ROLE_PROFESSIONAL
            )
            profile = ProfessionalProfile.objects.create(
                user=user,
                city=self.city,
                subcity=self.subcity,
                bio=f'Experienced plumber {i}',
                verification_status=ProfessionalProfile.STATUS_APPROVED
            )
            profile.categories.add(self.category)
            self.pros.append(user)

    def test_service_request_max_three_professionals_limit(self):
        self.client.force_authenticate(user=self.customer)

        # Attempting to select 4 professionals must fail
        payload_fail = {
            'category_id': self.category.id,
            'city_id': self.city.id,
            'subcity_id': self.subcity.id,
            'title': 'Leaking sink repair',
            'description': 'Water leaking under the kitchen sink continuously.',
            'service_address': 'Bole Atlas, House #402',
            'selected_professional_ids': [p.id for p in self.pros]  # 4 professionals
        }
        res_fail = self.client.post('/api/services/requests/', payload_fail, format='json')
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('selected_professional_ids', res_fail.data)

        # Selecting 2 professionals succeeds
        payload_success = {
            'category_id': self.category.id,
            'city_id': self.city.id,
            'subcity_id': self.subcity.id,
            'title': 'Leaking sink repair',
            'description': 'Water leaking under the kitchen sink continuously.',
            'service_address': 'Bole Atlas, House #402',
            'selected_professional_ids': [self.pros[0].id, self.pros[1].id]
        }
        res_success = self.client.post('/api/services/requests/', payload_success, format='json')
        self.assertEqual(res_success.status_code, status.HTTP_201_CREATED)
        req_id = res_success.data['id']

        # Verify recipients and persistent notifications delivered
        req = ServiceRequest.objects.get(id=req_id)
        self.assertEqual(req.recipients.count(), 2)
        self.assertEqual(Notification.objects.filter(recipient=self.pros[0]).count(), 1)
        self.assertEqual(Notification.objects.filter(recipient=self.pros[1]).count(), 1)

    def test_contact_protection_and_acceptance_workflow(self):
        # Create request targeting pro 0 and pro 1
        req = ServiceRequest.objects.create(
            customer=self.customer,
            category=self.category,
            city=self.city,
            subcity=self.subcity,
            title='Shower head replacement',
            description='Need shower head replaced today.',
            service_address='Kirkos Subcity, Kebele 02, House 118',
            status=ServiceRequest.STATUS_PENDING
        )
        r0 = ServiceRequestRecipient.objects.create(request=req, professional=self.pros[0])
        r1 = ServiceRequestRecipient.objects.create(request=req, professional=self.pros[1])

        # Pro 0 views before acceptance: contact info must be hidden
        self.client.force_authenticate(user=self.pros[0])
        view_res = self.client.get(f'/api/services/requests/{req.id}/')
        self.assertEqual(view_res.data['customer_phone'], 'Hidden until acceptance')
        self.assertEqual(view_res.data['service_address'], 'Hidden until acceptance')

        # Pro 0 tries to accept with insufficient balance (0.00 ETB) -> must fail with INSUFFICIENT_WALLET_BALANCE
        insufficient_res = self.client.post(f'/api/services/professional/requests/{req.id}/accept/')
        self.assertEqual(insufficient_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(insufficient_res.data.get('error_code'), 'INSUFFICIENT_WALLET_BALANCE')

        # Top up Pro 0's wallet with 150 ETB
        pro0_wallet, _ = Wallet.objects.get_or_create(professional=self.pros[0].professional_profile)
        pro0_wallet.balance = Decimal('150.00')
        pro0_wallet.save()

        # Pro 0 accepts the request -> succeeds and deducts exactly 50 ETB
        accept_res = self.client.post(f'/api/services/professional/requests/{req.id}/accept/')
        self.assertEqual(accept_res.status_code, status.HTTP_200_OK)
        self.assertEqual(accept_res.data.get('fee_deducted'), 50.0)
        self.assertEqual(accept_res.data.get('wallet_balance'), 100.0)

        pro0_wallet.refresh_from_db()
        self.assertEqual(pro0_wallet.balance, Decimal('100.00'))

        # Verify WalletTransaction record created
        fee_tx = WalletTransaction.objects.filter(
            wallet=pro0_wallet,
            service_request=req,
            transaction_type=WalletTransaction.TYPE_JOB_FEE
        ).first()
        self.assertIsNotNone(fee_tx)
        self.assertEqual(fee_tx.amount, Decimal('-50.00'))
        self.assertEqual(fee_tx.balance_after, Decimal('100.00'))
        self.assertEqual(fee_tx.status, WalletTransaction.STATUS_SUCCESS)

        # Refresh request
        req.refresh_from_db()
        self.assertEqual(req.status, ServiceRequest.STATUS_ACCEPTED)
        self.assertEqual(req.accepted_professional, self.pros[0])

        # Pro 0 views after acceptance: contact info is revealed
        view_after = self.client.get(f'/api/services/requests/{req.id}/')
        self.assertEqual(view_after.data['customer_phone'], self.customer.phone_number)
        self.assertEqual(view_after.data['service_address'], 'Kirkos Subcity, Kebele 02, House 118')

        # Pro 1 tries to accept now: must be rejected because already accepted
        self.client.force_authenticate(user=self.pros[1])
        pro1_accept = self.client.post(f'/api/services/professional/requests/{req.id}/accept/')
        self.assertEqual(pro1_accept.status_code, status.HTTP_400_BAD_REQUEST)

    def test_job_completion_and_two_way_rating(self):
        req = ServiceRequest.objects.create(
            customer=self.customer,
            category=self.category,
            city=self.city,
            title='Wiring fixture',
            description='Fix lamp wiring',
            service_address='Bole Road',
            status=ServiceRequest.STATUS_ACCEPTED,
            accepted_professional=self.pros[0]
        )

        # Cannot review before completion
        self.client.force_authenticate(user=self.customer)
        early_review = self.client.post('/api/reviews/', {
            'service_request_id': req.id,
            'rating': 5,
            'comment': 'Good work'
        })
        self.assertEqual(early_review.status_code, status.HTTP_400_BAD_REQUEST)

        # Mark job complete
        comp_res = self.client.post(f'/api/services/requests/{req.id}/complete/')
        self.assertEqual(comp_res.status_code, status.HTTP_200_OK)
        req.refresh_from_db()
        self.assertEqual(req.status, ServiceRequest.STATUS_COMPLETED)

        # Customer reviews professional (5 stars)
        cust_rev = self.client.post('/api/reviews/', {
            'service_request_id': req.id,
            'rating': 5,
            'comment': 'Very punctual and neat work!'
        })
        self.assertEqual(cust_rev.status_code, status.HTTP_201_CREATED)

        # Duplicate review by customer on same request must fail
        dup_rev = self.client.post('/api/reviews/', {
            'service_request_id': req.id,
            'rating': 4,
            'comment': 'Trying duplicate review'
        })
        self.assertEqual(dup_rev.status_code, status.HTTP_400_BAD_REQUEST)

        # Professional reviews customer (5 stars)
        self.client.force_authenticate(user=self.pros[0])
        pro_rev = self.client.post('/api/reviews/', {
            'service_request_id': req.id,
            'rating': 5,
            'comment': 'Great customer, clear instructions and prompt payment.'
        })
        self.assertEqual(pro_rev.status_code, status.HTTP_201_CREATED)

        # Verify professional's average rating recalculated
        self.pros[0].professional_profile.refresh_from_db()
        self.assertEqual(float(self.pros[0].professional_profile.average_rating), 5.0)
        self.assertEqual(self.pros[0].professional_profile.completed_jobs_count, 1)

    def test_user_cannot_dispatch_service_request_to_themselves(self):
        # 1. A professional cannot create service requests at all
        self.client.force_authenticate(user=self.pros[0])
        payload_pro = {
            'category_id': self.category.id,
            'city_id': self.city.id,
            'subcity_id': self.subcity.id,
            'title': 'Self dispatch attempt by pro',
            'description': 'Attempting to dispatch a request as a pro.',
            'service_address': 'Bole Atlas',
            'selected_professional_ids': [self.pros[0].id]
        }
        res_pro = self.client.post('/api/services/requests/', payload_pro, format='json')
        self.assertEqual(res_pro.status_code, status.HTTP_403_FORBIDDEN)

        # 2. A customer cannot select themselves in selected_professional_ids
        self.client.force_authenticate(user=self.customer)
        payload_cust = {
            'category_id': self.category.id,
            'city_id': self.city.id,
            'subcity_id': self.subcity.id,
            'title': 'Customer self dispatch attempt',
            'description': 'Attempting to select own id.',
            'service_address': 'Bole Atlas',
            'selected_professional_ids': [self.customer.id]
        }
        res_cust = self.client.post('/api/services/requests/', payload_cust, format='json')
        self.assertEqual(res_cust.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot dispatch a service request to yourself', str(res_cust.data).lower())
