import io
from PIL import Image
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from professionals.models import City, SubCity, ServiceCategory

User = get_user_model()

def get_test_image_file(name="avatar.jpg"):
    file = io.BytesIO()
    image = Image.new('RGB', (100, 100), color=(73, 109, 137))
    image.save(file, 'JPEG')
    file.seek(0)
    return SimpleUploadedFile(name, file.read(), content_type='image/jpeg')


class AccountsAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.city = City.objects.create(name='Addis Ababa')
        self.subcity = SubCity.objects.create(city=self.city, name='Bole')
        self.category = ServiceCategory.objects.create(
            name='Electrical Repair', slug='electrical-repair'
        )

    def test_customer_registration_and_login(self):
        # 1. Registration fails without required profile picture
        data_missing_photo = {
            'username': 'kebede_no_pic',
            'password': 'SecurePassword123!',
            'first_name': 'Kebede',
            'last_name': 'Tesfaye',
            'phone_number': '0911223399',
            'city_id': self.city.id,
            'subcity_id': self.subcity.id,
            'address_details': 'Near Edna Mall'
        }
        res_fail = self.client.post('/api/accounts/register/customer/', data_missing_photo, format='multipart')
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('profile_picture', res_fail.data)

        # 2. Registration succeeds with profile picture
        photo = get_test_image_file('kebede.jpg')
        data = {
            'username': 'kebede',
            'password': 'SecurePassword123!',
            'first_name': 'Kebede',
            'last_name': 'Tesfaye',
            'phone_number': '0911223344',
            'city_id': self.city.id,
            'subcity_id': self.subcity.id,
            'address_details': 'Near Edna Mall',
            'profile_picture': photo
        }
        res = self.client.post('/api/accounts/register/customer/', data, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', res.data)
        self.assertEqual(res.data['user']['role'], 'CUSTOMER')
        self.assertIsNotNone(res.data['user']['profile_picture'])

        # Verify phone was normalized to Ethiopian standard
        user = User.objects.get(username='kebede')
        self.assertEqual(user.phone_number, '+251911223344')
        self.assertTrue(user.is_customer)
        self.assertTrue(bool(user.customer_profile.profile_picture))

        # Login
        login_res = self.client.post('/api/accounts/login/', {
            'username': 'kebede',
            'password': 'SecurePassword123!'
        })
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_res.data)
        self.assertIn('profile_picture', login_res.data['user'])

    def test_professional_registration_requires_certificate_and_photo(self):
        cert_file = SimpleUploadedFile("cert.pdf", b"%PDF-1.4 dummy content", content_type="application/pdf")
        photo = get_test_image_file('abebe_pro.jpg')

        # 1. Fails without profile photo
        data_no_photo = {
            'username': 'pro_no_photo',
            'password': 'SecurePassword123!',
            'first_name': 'Abebe',
            'last_name': 'Bekele',
            'phone_number': '0912345679',
            'city_id': self.city.id,
            'subcity_id': self.subcity.id,
            'category_ids': f'[{self.category.id}]',
            'bio': 'Certified electrician with 5 years experience',
            'experience_years': 5,
            'certificate_title': 'Level 4 Electrical Certification',
            'certificate_file': cert_file
        }
        res_fail = self.client.post('/api/accounts/register/professional/', data_no_photo, format='multipart')
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('profile_picture', res_fail.data)

        # 2. Succeeds with certificate and photo
        cert_file.seek(0)
        data = {
            'username': 'pro_abebe',
            'password': 'SecurePassword123!',
            'first_name': 'Abebe',
            'last_name': 'Bekele',
            'phone_number': '0912345678',
            'city_id': self.city.id,
            'subcity_id': self.subcity.id,
            'category_ids': f'[{self.category.id}]',
            'bio': 'Certified electrician with 5 years experience',
            'experience_years': 5,
            'certificate_title': 'Level 4 Electrical Certification',
            'certificate_file': cert_file,
            'profile_picture': photo
        }
        res = self.client.post('/api/accounts/register/professional/', data, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        
        pro_user = User.objects.get(username='pro_abebe')
        self.assertTrue(pro_user.is_professional)
        self.assertEqual(pro_user.professional_profile.verification_status, 'PENDING')
        self.assertEqual(pro_user.professional_profile.certificates.count(), 1)
        self.assertTrue(bool(pro_user.professional_profile.profile_picture))

    def test_banned_user_restrictions(self):
        user = User.objects.create_user(
            username='banned_user',
            password='Password123!',
            role=User.ROLE_CUSTOMER,
            is_banned=True,
            ban_reason='Suspended for abuse.'
        )
        login_res = self.client.post('/api/accounts/login/', {
            'username': 'banned_user',
            'password': 'Password123!'
        })
        self.assertEqual(login_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('suspended', str(login_res.data))

    def test_preferred_theme_and_language_sync(self):
        user = User.objects.create_user(
            username='theme_user',
            password='Password123!',
            role=User.ROLE_CUSTOMER
        )
        self.assertEqual(user.preferred_theme, 'light')

        self.client.force_authenticate(user=user)
        # Update theme to dark via CurrentUserView PATCH
        res = self.client.patch('/api/accounts/me/', {'preferred_theme': 'dark'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.preferred_theme, 'dark')

        # Retrieve user profile includes preferred_theme
        get_res = self.client.get('/api/accounts/me/')
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_res.data['preferred_theme'], 'dark')
