from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

class BannedUserMiddleware(MiddlewareMixin):
    """
    Blocks banned users from performing authenticated operations.
    Excludes public logout or status checks if needed, but blocks mutating / protected endpoints.
    """
    def process_request(self, request):
        if request.user and request.user.is_authenticated:
            if getattr(request.user, 'is_banned', False):
                # Allow Django admin login/logout if staff, but block API usage
                if not request.path.startswith('/admin/'):
                    return JsonResponse(
                        {
                            'detail': 'Your account has been suspended by an administrator.',
                            'is_banned': True,
                            'ban_reason': request.user.ban_reason or 'Violation of marketplace terms.'
                        },
                        status=403
                    )
        return None
