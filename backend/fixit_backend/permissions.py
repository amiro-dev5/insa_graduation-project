from rest_framework import permissions

class IsCustomer(permissions.BasePermission):
    """
    Allows access only to authenticated customers who are not banned.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'CUSTOMER' and
            not getattr(request.user, 'is_banned', False)
        )


class IsProfessional(permissions.BasePermission):
    """
    Allows access only to authenticated professionals who are not banned.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'PROFESSIONAL' and
            not getattr(request.user, 'is_banned', False)
        )


class IsVerifiedProfessional(permissions.BasePermission):
    """
    Allows access only to approved/verified professionals who are not banned.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.role == 'PROFESSIONAL'):
            return False
        if getattr(request.user, 'is_banned', False):
            return False
        profile = getattr(request.user, 'professional_profile', None)
        return bool(profile and profile.verification_status == 'APPROVED')


class IsAdminUserOrReadOnly(permissions.BasePermission):
    """
    Allows safe methods for all, but modifying methods only for staff/admin.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and (request.user.is_staff or request.user.role == 'ADMIN'))
