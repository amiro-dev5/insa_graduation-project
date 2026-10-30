from django.contrib import admin
from .models import Post, PostLike

class PostLikeInline(admin.TabularInline):
    model = PostLike
    extra = 0
    readonly_fields = ('user', 'created_at')


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'author', 'content_snippet', 'likes_count', 'created_at')
    search_fields = ('author__username', 'content')
    list_filter = ('created_at',)
    inlines = [PostLikeInline]
    readonly_fields = ('created_at', 'updated_at')

    def content_snippet(self, obj):
        return obj.content[:60] + '...' if len(obj.content) > 60 else obj.content


@admin.register(PostLike)
class PostLikeAdmin(admin.ModelAdmin):
    list_display = ('post', 'user', 'created_at')
    search_fields = ('post__content', 'user__username')
