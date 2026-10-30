import io
from PIL import Image
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import CustomerProfile
from professionals.models import City, SubCity, ServiceCategory, ProfessionalProfile
from services.models import ServiceRequest
from reviews.models import Review

User = get_user_model()


def get_test_image(name="avatar.jpg"):
    f = io.BytesIO()
    img = Image.new('RGB', (100, 100), color=(120, 150, 180))
    img.save(f, 'JPEG')
    f.seek(0)
    return SimpleUploadedFile(name, f.read(), content_type='image/jpeg')


class ReviewSecurityAndValidationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.city = City.objects.create(name='Addis Ababa')
        self.subcity = SubCity.objects.create(city=self.city, name='Bole')
        self.category = ServiceCategory.objects.create(name='Plumbing', slug='plumbing')

        # Create Customer
        self.customer_user = User.objects.create_user(
            username='almaz_customer',
            password='SecurePassword123!',
            first_name='Almaz',
            last_name='Ayele',
            phone_number='+251911000001',
            role=User.ROLE_CUSTOMER
        )
        self.customer_profile = CustomerProfile.objects.create(
            user=self.customer_user,
            city=self.city,
            subcity=self.subcity,
            address_details='Near Edna Mall',
            profile_picture=get_test_image('almaz_cust.jpg')
        )

        # Create Professional
        self.pro_user = User.objects.create_user(
            username='chala_pro',
            password='SecurePassword123!',
            first_name='Chala',
            last_name='Guta',
            phone_number='+251911000002',
            role=User.ROLE_PROFESSIONAL
        )
        self.pro_profile = ProfessionalProfile.objects.create(
            user=self.pro_user,
            city=self.city,
            subcity=self.subcity,
            verification_status=ProfessionalProfile.STATUS_APPROVED,
            experience_years=4,
            bio='Experienced master plumber',
            profile_picture=get_test_image('chala_pro.jpg')
        )
        self.pro_profile.categories.add(self.category)

        # Create completed service request
        self.completed_request = ServiceRequest.objects.create(
            customer=self.customer_user,
            accepted_professional=self.pro_user,
            category=self.category,
            city=self.city,
            subcity=self.subcity,
            service_address='Bole Atlas',
            title='Fix kitchen pipe leak',
            description='Pipe is leaking under the sink.',
            status=ServiceRequest.STATUS_COMPLETED
        )

        # Create pending service request
        self.pending_request = ServiceRequest.objects.create(
            customer=self.customer_user,
            category=self.category,
            city=self.city,
            subcity=self.subcity,
            service_address='Bole Atlas',
            title='Bathroom renovation plumbing',
            description='Install new pipes.',
            status=ServiceRequest.STATUS_PENDING
        )

    def test_customer_can_review_professional_after_completion(self):
        self.client.force_authenticate(user=self.customer_user)
        res = self.client.post('/api/reviews/', {
            'service_request_id': self.completed_request.id,
            'rating': 5,
            'comment': 'Outstanding plumbing service, resolved the issue promptly.'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['rating'], 5)
        self.assertEqual(res.data['reviewer'], self.customer_user.id)
        self.assertEqual(res.data['reviewee'], self.pro_user.id)

        # Verify professional's average_rating updated
        self.pro_profile.refresh_from_db()
        self.assertEqual(float(self.pro_profile.average_rating), 5.0)

    def test_professional_can_review_customer_after_completion(self):
        self.client.force_authenticate(user=self.pro_user)
        res = self.client.post('/api/reviews/', {
            'service_request_id': self.completed_request.id,
            'rating': 5,
            'comment': 'Courteous customer, clear instructions and prompt access.'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['reviewer'], self.pro_user.id)
        self.assertEqual(res.data['reviewee'], self.customer_user.id)

    def test_self_review_is_strictly_prohibited_at_api_level(self):
        # Create a mock completed request where both customer and accepted_professional are the same user
        self_request = ServiceRequest.objects.create(
            customer=self.pro_user,
            accepted_professional=self.pro_user,
            category=self.category,
            city=self.city,
            subcity=self.subcity,
            service_address='Test Address',
            title='Self repair test',
            description='Testing self rating prohibition.',
            status=ServiceRequest.STATUS_COMPLETED
        )

        self.client.force_authenticate(user=self.pro_user)
        res = self.client.post('/api/reviews/', {
            'service_request_id': self_request.id,
            'rating': 5,
            'comment': 'I am giving myself 5 stars!'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        error_msg = str(res.data)
        self.assertTrue('prohibited' in error_msg.lower() or 'cannot review' in error_msg.lower())

    def test_self_review_is_strictly_prohibited_at_model_level(self):
        review = Review(
            service_request=self.completed_request,
            reviewer=self.pro_user,
            reviewee=self.pro_user,
            rating=5,
            comment='Self rating attempt directly via model'
        )
        # clean() must raise ValidationError
        with self.assertRaises(ValidationError):
            review.clean()

        # save() must raise ValidationError
        with self.assertRaises(ValidationError):
            review.save()

    def test_review_rejected_for_non_completed_requests(self):
        self.client.force_authenticate(user=self.customer_user)
        res = self.client.post('/api/reviews/', {
            'service_request_id': self.pending_request.id,
            'rating': 4,
            'comment': 'Good job so far'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('completed', str(res.data).lower())

    def test_unrelated_user_cannot_submit_review(self):
        outsider = User.objects.create_user(
            username='outsider_user',
            password='SecurePassword123!',
            first_name='Mulu',
            last_name='Girmay',
            phone_number='+251911000099',
            role=User.ROLE_CUSTOMER
        )
        self.client.force_authenticate(user=outsider)
        res = self.client.post('/api/reviews/', {
            'service_request_id': self.completed_request.id,
            'rating': 5,
            'comment': 'I was not part of this request'
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('only the customer or the assigned professional', str(res.data).lower())

    def test_duplicate_review_by_same_user_rejected(self):
        self.client.force_authenticate(user=self.customer_user)
        # First review succeeds
        res1 = self.client.post('/api/reviews/', {
            'service_request_id': self.completed_request.id,
            'rating': 5,
            'comment': 'First review'
        })
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Second review on same request fails
        res2 = self.client.post('/api/reviews/', {
            'service_request_id': self.completed_request.id,
            'rating': 4,
            'comment': 'Second review attempt'
        })
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already submitted', str(res2.data).lower())
