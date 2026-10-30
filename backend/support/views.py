import time
from django.core.cache import cache
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .guardrails import (
    detect_language,
    get_refusal_message,
    pre_screen_scope,
    strip_emojis,
)
from .models import SupportMessage
from .services import GeminiService


class SupportChatView(APIView):
    """
    Authenticated FixIt Support Chatbot endpoint.
    Accessible to both Customers and Professionals.
    Enforces server-side pre-screening, rate limiting, and zero-emoji compliance.
    """
    permission_classes = [permissions.IsAuthenticated]

    # Max requests allowed per window per user
    RATE_LIMIT_MAX = 20
    RATE_LIMIT_WINDOW_SECONDS = 60

    def check_rate_limit(self, user_id: int) -> bool:
        """
        Sliding window rate-limiter per user ID using Django cache.
        Returns True if within rate limit, False if exceeded.
        """
        cache_key = f"support_rate_limit_{user_id}"
        timestamps = cache.get(cache_key, [])
        now = time.time()

        # Prune timestamps older than window
        timestamps = [ts for ts in timestamps if now - ts < self.RATE_LIMIT_WINDOW_SECONDS]

        if len(timestamps) >= self.RATE_LIMIT_MAX:
            return False

        timestamps.append(now)
        cache.set(cache_key, timestamps, self.RATE_LIMIT_WINDOW_SECONDS)
        return True

    def post(self, request):
        user = request.user

        # 1. Rate Limiting Check
        if not self.check_rate_limit(user.id):
            return Response(
                {"error": "Too many requests. Please slow down and try again shortly."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # 2. Input Validation
        raw_message = request.data.get('message', '')
        if not isinstance(raw_message, str):
            return Response(
                {"error": "Invalid message format. String required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        message = strip_emojis(raw_message.strip())
        if not message:
            return Response(
                {"error": "Message content cannot be blank."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(message) > 500:
            return Response(
                {"error": "Message exceeds the 500 character limit."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Determine Language Preference
        preferred_lang = request.data.get('language') or getattr(user, 'preferred_language', 'en') or 'en'
        history = request.data.get('history', [])
        if not isinstance(history, list):
            history = []

        # 4. Server-Side Scope Pre-screening & Prompt Injection Defense
        is_allowed, detected_lang, refusal_text = pre_screen_scope(message, preferred_lang)

        # Audit incoming user message
        try:
            SupportMessage.objects.create(
                user=user,
                role='user',
                message=message,
                language=detected_lang,
                is_refusal=not is_allowed
            )
        except Exception:
            pass

        if not is_allowed:
            # Deterministic out-of-scope / adversarial refusal without invoking external AI
            try:
                SupportMessage.objects.create(
                    user=user,
                    role='assistant',
                    message=refusal_text,
                    language=detected_lang,
                    is_refusal=True
                )
            except Exception:
                pass

            return Response({
                "response": refusal_text,
                "language": detected_lang,
                "refusal": True
            }, status=status.HTTP_200_OK)

        # 5. Gemini AI Service with Automatic Key Rotation
        service = GeminiService()
        response_text, is_refusal = service.generate_response(
            message=message,
            language=detected_lang,
            history=history
        )

        clean_response = strip_emojis(response_text)

        # Audit assistant response
        try:
            SupportMessage.objects.create(
                user=user,
                role='assistant',
                message=clean_response,
                language=detected_lang,
                is_refusal=is_refusal
            )
        except Exception:
            pass

        return Response({
            "response": clean_response,
            "language": detected_lang,
            "refusal": is_refusal
        }, status=status.HTTP_200_OK)


class SupportHistoryView(APIView):
    """
    Fetches recent support messages for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        messages = SupportMessage.objects.filter(user=request.user).order_by('-created_at')[:30]
        data = [
            {
                "id": m.id,
                "role": m.role,
                "message": m.message,
                "language": m.language,
                "is_refusal": m.is_refusal,
                "created_at": m.created_at.isoformat(),
            }
            for m in reversed(list(messages))
        ]
        return Response(data, status=status.HTTP_200_OK)
