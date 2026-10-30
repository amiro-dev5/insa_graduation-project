from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from professionals.models import City, ServiceCategory, ProfessionalProfile
from posts.models import Post, PostLike

User = get_user_model()

class PostAndLikeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.city = City.objects.create(name='Addis Ababa')
        self.category = ServiceCategory.objects.create(name='Carpentry', slug='carpentry')

        # Verified Pro
        self.pro_user = User.objects.create_user(
            username='pro_carpenter',
            password='Password123!',
            first_name='Mulugeta',
            last_name='Desta',
            role=User.ROLE_PROFESSIONAL
        )
        self.pro_profile = ProfessionalProfile.objects.create(
            user=self.pro_user,
            city=self.city,
            verification_status=ProfessionalProfile.STATUS_APPROVED
        )

        # Unverified Pro
        self.unverified_pro = User.objects.create_user(
            username='pro_unverified',
            password='Password123!',
            role=User.ROLE_PROFESSIONAL
        )
        ProfessionalProfile.objects.create(
            user=self.unverified_pro,
            city=self.city,
            verification_status=ProfessionalProfile.STATUS_PENDING
        )

        # Customer
        self.customer = User.objects.create_user(
            username='cust_user',
            password='Password123!',
            role=User.ROLE_CUSTOMER
        )

    def test_post_creation_requires_verified_professional(self):
        # Customer cannot create post
        self.client.force_authenticate(user=self.customer)
        res_cust = self.client.post('/api/posts/', {'content': 'Hello world'})
        self.assertEqual(res_cust.status_code, status.HTTP_403_FORBIDDEN)

        # Unverified pro cannot create post
        self.client.force_authenticate(user=self.unverified_pro)
        res_unver = self.client.post('/api/posts/', {'content': 'Hello world'})
        self.assertEqual(res_unver.status_code, status.HTTP_403_FORBIDDEN)

        # Verified pro can create post
        self.client.force_authenticate(user=self.pro_user)
        res_pro = self.client.post('/api/posts/', {'content': 'Just completed custom dining table set.'})
        self.assertEqual(res_pro.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Post.objects.count(), 1)

    def test_like_and_unlike_workflow(self):
        post = Post.objects.create(author=self.pro_user, content='Finished cabinet installation.')

        self.client.force_authenticate(user=self.customer)
        
        # Like post
        res_like = self.client.post(f'/api/posts/{post.id}/like/')
        self.assertEqual(res_like.status_code, status.HTTP_200_OK)
        self.assertTrue(res_like.data['has_liked'])
        self.assertEqual(res_like.data['likes_count'], 1)
        self.assertEqual(PostLike.objects.count(), 1)

        # Clicking like again unlikes
        res_unlike = self.client.post(f'/api/posts/{post.id}/like/')
        self.assertEqual(res_unlike.status_code, status.HTTP_200_OK)
        self.assertFalse(res_unlike.data['has_liked'])
        self.assertEqual(res_unlike.data['likes_count'], 0)
        self.assertEqual(PostLike.objects.count(), 0)
