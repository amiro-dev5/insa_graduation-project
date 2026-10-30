from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db.models import Count

from .models import Post, PostLike
from .serializers import PostSerializer
from fixit_backend.permissions import IsVerifiedProfessional

class IsAuthorOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.author == request.user or request.user.is_staff or request.user.role == 'ADMIN'


class PostListCreateView(generics.ListCreateAPIView):
    serializer_class = PostSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsVerifiedProfessional()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        return Post.objects.filter(
            author__is_banned=False
        ).select_related(
            'author',
            'author__professional_profile',
            'author__customer_profile'
        ).prefetch_related(
            'author__professional_profile__categories'
        ).annotate(
            likes_count_annotated=Count('likes')
        ).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class PostDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    serializer_class = PostSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Post.objects.filter(author__is_banned=False).select_related('author')


class TogglePostLikeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        like, created = PostLike.objects.get_or_create(post=post, user=request.user)

        if not created:
            # User already liked it, so clicking again unlikes
            like.delete()
            has_liked = False
        else:
            has_liked = True

        return Response({
            'has_liked': has_liked,
            'likes_count': post.likes.count()
        }, status=status.HTTP_200_OK)
