import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Heart,
  MessageSquare,
  Share2,
  Image,
  Send,
  MoreVertical,
  Trash2,
  Edit2,
  Clock,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { api, getMediaUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Post } from '../types';
import { Avatar } from '../components/Avatar';

export const HomeFeedPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { t, formatDate, translateCategory } = useLanguage();
  const queryClient = useQueryClient();

  const [newContent, setNewContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState('');

  // Fetch feed posts
  const { data: postsData, isLoading, isError } = useQuery<{ results: Post[] } | Post[]>({
    queryKey: ['feed-posts'],
    queryFn: async () => {
      const res = await api.get('/posts/');
      return res.data;
    },
  });

  const posts: Post[] = Array.isArray(postsData) ? postsData : postsData?.results || [];

  // Toggle Like Mutation
  const likeMutation = useMutation({
    mutationFn: async (postId: number) => {
      const res = await api.post(`/posts/${postId}/like/`);
      return { postId, ...res.data };
    },
    onMutate: async (postId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['feed-posts'] });
      const previousPosts = queryClient.getQueryData(['feed-posts']);

      queryClient.setQueryData(['feed-posts'], (old: any) => {
        if (!old) return old;
        const updateList = (list: Post[]) =>
          list.map((p) => {
            if (p.id === postId) {
              const nextLiked = !p.has_liked;
              return {
                ...p,
                has_liked: nextLiked,
                likes_count: nextLiked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1),
              };
            }
            return p;
          });

        return Array.isArray(old) ? updateList(old) : { ...old, results: updateList(old.results) };
      });

      return { previousPosts };
    },
    onError: (_err, _newVal, context: any) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(['feed-posts'], context.previousPosts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
    },
  });

  // Create Post Mutation
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() && !selectedImage) return;

    setIsPosting(true);
    try {
      const formData = new FormData();
      formData.append('content', newContent);
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      await api.post('/posts/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setNewContent('');
      setSelectedImage(null);
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to publish post.');
    } finally {
      setIsPosting(false);
    }
  };

  // Delete Post Mutation
  const deleteMutation = useMutation({
    mutationFn: async (postId: number) => {
      await api.delete(`/posts/${postId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
    },
  });

  // Edit Post Mutation
  const handleSaveEdit = async () => {
    if (!editingPost || !editContent.trim()) return;
    try {
      await api.patch(`/posts/${editingPost.id}/`, { content: editContent });
      setEditingPost(null);
      setEditContent('');
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
    } catch {
      alert('Failed to update post.');
    }
  };

  const isVerifiedPro =
    user?.role === 'PROFESSIONAL' &&
    user.professional_profile?.verification_status === 'APPROVED';

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Banner */}
      <div className="mb-6 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('feed.title')}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('feed.subtitle')}
          </p>
        </div>
        <Link
          to="/search"
          className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 dark:bg-indigo-600 text-white hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors shrink-0"
        >
          <span>{t('feed.find_pro_btn')}</span>
        </Link>
      </div>

      {/* Post Creator (Verified Pros Only) */}
      {isVerifiedPro && (
        <div className="mb-6 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <form onSubmit={handleCreatePost}>
            <div className="flex items-start space-x-3">
              <Avatar
                src={user?.profile_picture}
                name={user?.full_name || user?.username}
                role={t('feed.verified_pro_badge')}
                size="md"
              />
              <div className="flex-1">
                <textarea
                  rows={3}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder={t('feed.composer_placeholder')}
                  className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
                />

                {selectedImage && (
                  <div className="mt-2 relative inline-block">
                    <img
                      src={URL.createObjectURL(selectedImage)}
                      alt="Selected preview"
                      className="h-28 w-auto rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedImage(null)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-800 dark:bg-slate-700 text-white rounded-full flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <label className="cursor-pointer inline-flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600">
                    <Image size={15} />
                    <span>{t('feed.attach_photo')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={isPosting || (!newContent.trim() && !selectedImage)}
                    className="inline-flex items-center space-x-1.5 py-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
                  >
                    <span>{isPosting ? t('feed.publishing') : t('feed.publish_btn')}</span>
                    <Send size={13} />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Loading & Error States */}
      {isLoading && (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('feed.loading_feed')}</p>
        </div>
      )}

      {isError && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-center">
          <AlertCircle size={24} className="text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('common.error')}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('feed.error_loading')}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && posts.length === 0 && (
        <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <Briefcase size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('feed.empty_feed_title')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {t('feed.empty_feed_desc')}
          </p>
        </div>
      )}

      {/* Feed Posts */}
      <div className="space-y-4">
        {posts.map((post) => {
          const isAuthor = user?.id === post.author.id;
          const proProfileId = post.author.professional_id;

          return (
            <div
              key={post.id}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-shadow hover:shadow-sm"
            >
              {/* Post Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Avatar
                    src={post.author.profile_picture}
                    alt={post.author.full_name}
                    name={post.author.full_name}
                    role={t('feed.verified_pro_badge')}
                    size="md"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      {proProfileId ? (
                        <Link
                          to={`/professionals/${proProfileId}`}
                          className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          {post.author.full_name}
                        </Link>
                      ) : (
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {post.author.full_name}
                        </span>
                      )}
                      <span className="inline-flex items-center text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
                        {t('feed.verified_pro_badge')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                      {post.author.categories && post.author.categories.length > 0 && (
                        <span>{post.author.categories.map((c) => translateCategory(c)).join(', ')}</span>
                      )}
                      <span>·</span>
                      <span className="flex items-center space-x-1">
                        <Clock size={11} />
                        <span>{formatDate(post.created_at)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {isAuthor && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingPost(post);
                        setEditContent(post.content);
                      }}
                      className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      title={t('common.edit')}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(t('feed.delete_post_confirm'))) {
                          deleteMutation.mutate(post.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                      title={t('common.delete')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Post Content */}
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line mb-3">
                {post.content}
              </p>

              {/* Post Attached Image */}
              {post.image && (
                <div className="mb-4 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 max-h-96 bg-slate-50 dark:bg-slate-800">
                  <img
                    src={getMediaUrl(post.image)}
                    alt="Post attachment"
                    className="w-full h-auto object-cover max-h-96"
                  />
                </div>
              )}

              {/* Interaction Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      alert(t('feed.composer_placeholder'));
                      return;
                    }
                    likeMutation.mutate(post.id);
                  }}
                  className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg transition-colors font-medium ${
                    post.has_liked
                      ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Heart
                    size={16}
                    className={post.has_liked ? 'fill-rose-600 text-rose-600 dark:fill-rose-400 dark:text-rose-400' : 'text-slate-500'}
                  />
                  <span>
                    {post.likes_count} {t('feed.likes')}
                  </span>
                </button>

                {proProfileId && (
                  <Link
                    to={`/professionals/${proProfileId}`}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                  >
                    {t('search.view_profile')} →
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Post Modal */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">{t('common.edit')}</h3>
            <textarea
              rows={4}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none"
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
