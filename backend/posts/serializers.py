from rest_framework import serializers
from .models import Post, PostLike

class PostAuthorSerializer(serializers.Serializer):
    id = serializers.IntegerField(source='author.id')
    username = serializers.CharField(source='author.username')
    full_name = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    professional_id = serializers.SerializerMethodField()
    categories = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return obj.author.get_full_name() or obj.author.username

    def get_profile_picture(self, obj):
        if hasattr(obj.author, 'professional_profile') and obj.author.professional_profile.profile_picture:
            return obj.author.professional_profile.profile_picture.url
        elif hasattr(obj.author, 'customer_profile') and obj.author.customer_profile.profile_picture:
            return obj.author.customer_profile.profile_picture.url
        return None

    def get_professional_id(self, obj):
        if hasattr(obj.author, 'professional_profile'):
            return obj.author.professional_profile.id
        return None

    def get_categories(self, obj):
        if hasattr(obj.author, 'professional_profile'):
            return [c.name for c in obj.author.professional_profile.categories.all()]
        return []


class PostSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    likes_count = serializers.IntegerField(read_only=True)
    has_liked = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ['id', 'author', 'content', 'image', 'created_at', 'updated_at', 'likes_count', 'has_liked']
        read_only_fields = ['id', 'created_at', 'updated_at', 'likes_count', 'has_liked']

    def get_author(self, obj):
        pro_id = None
        pic = None
        cats = []
        if hasattr(obj.author, 'professional_profile'):
            pro_id = obj.author.professional_profile.id
            if obj.author.professional_profile.profile_picture:
                pic = obj.author.professional_profile.profile_picture.url
            cats = [c.name for c in obj.author.professional_profile.categories.all()]

        return {
            'id': obj.author.id,
            'username': obj.author.username,
            'full_name': obj.author.get_full_name() or obj.author.username,
            'profile_picture': pic,
            'professional_id': pro_id,
            'categories': cats
        }

    def get_has_liked(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return PostLike.objects.filter(post=obj, user=request.user).exists()
        return False
