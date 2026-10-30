import json
import logging
import random
import time
import urllib.error
import urllib.request
from typing import Dict, List, Optional, Set, Tuple

from django.conf import settings
from .guardrails import (
    get_system_prompt,
    get_fallback_message,
    get_refusal_message,
    strip_emojis,
    REFUSAL_MESSAGES,
)

logger = logging.getLogger(__name__)


class GeminiService:
    """
    Production-grade AI client integrating Google Gemini with dynamic model discovery,
    Flash model preference, safe multi-key rotation, bounded retries, and strict zero-emoji enforcement.
    """
    _current_key_index: int = 0
    _active_model: Optional[str] = None
    _discovered_models: List[str] = []
    _models_cache_timestamp: float = 0.0
    _cache_ttl_seconds: float = 3600.0  # Cache model list for 1 hour
    _unavailable_models: Set[str] = set()

    # Prioritized preferred Flash models
    PREFERRED_FLASH_MODELS = [
        'gemini-3.5-flash',
        'gemini-3.8-flash',
        'gemini-3.7-flash',
        'gemini-3.6-flash',
        'gemini-flash-latest',
        'gemini-3.5-flash-lite',
        'gemini-flash-lite-latest',
    ]

    def __init__(self):
        raw_keys = getattr(settings, 'GEMINI_API_KEYS', [])
        # Ensure list of non-empty stripped keys
        if isinstance(raw_keys, str):
            self.api_keys: List[str] = [k.strip() for k in raw_keys.split(',') if k.strip()]
        else:
            self.api_keys: List[str] = [str(k).strip() for k in raw_keys if str(k).strip()]

        self.configured_model: str = getattr(settings, 'GEMINI_MODEL', 'gemini-3.5-flash').strip()
        self.base_url = 'https://generativelanguage.googleapis.com/v1beta/models'

    @classmethod
    def get_current_key_index(cls) -> int:
        return cls._current_key_index

    @classmethod
    def rotate_key(cls, total_keys: int) -> int:
        if total_keys > 0:
            cls._current_key_index = (cls._current_key_index + 1) % total_keys
        return cls._current_key_index

    @classmethod
    def reset_state(cls):
        """Helper for tests to reset class-level state."""
        cls._current_key_index = 0
        cls._active_model = None
        cls._discovered_models = []
        cls._models_cache_timestamp = 0.0
        cls._unavailable_models = set()

    def discover_models(self, key: str) -> List[str]:
        """
        Queries Google's ModelService to discover models that support generateContent.
        Caches discovered models for TTL (default 1 hour) to avoid unnecessary requests.
        """
        now = time.time()
        if (
            self.__class__._discovered_models
            and (now - self.__class__._models_cache_timestamp) < self._cache_ttl_seconds
        ):
            return self.__class__._discovered_models

        list_url = f"{self.base_url}?key={key}"
        req = urllib.request.Request(list_url, method='GET')
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode('utf-8'))
                    valid_models: List[str] = []
                    for m in data.get('models', []):
                        methods = m.get('supportedGenerationMethods', [])
                        if 'generateContent' in methods:
                            clean_name = m.get('name', '').replace('models/', '').strip()
                            if clean_name:
                                valid_models.append(clean_name)

                    if valid_models:
                        self.__class__._discovered_models = valid_models
                        self.__class__._models_cache_timestamp = now
                        logger.info("Successfully discovered %d models from Gemini API.", len(valid_models))
                        return valid_models
        except urllib.error.HTTPError as e:
            try:
                err_data = json.loads(e.read().decode('utf-8'))
                err_msg = err_data.get('error', {}).get('message', str(e))
            except Exception:
                err_msg = str(e)
            logger.warning("Failed model discovery (HTTP %d): %s", e.code, err_msg)
        except Exception as e:
            logger.warning("Error during model discovery: %s", type(e).__name__)

        # Fallback if discovery network request fails
        fallback_models = list(self.PREFERRED_FLASH_MODELS)
        if self.configured_model and self.configured_model not in fallback_models:
            fallback_models.insert(0, self.configured_model)
        return fallback_models

    def get_candidate_models(self, key: Optional[str] = None) -> List[str]:
        """
        Returns a prioritized, deduplicated list of available models.
        Filters out models previously confirmed as 404/unavailable.
        Prefers configured model first, followed by discovered Flash models.
        """
        discovered = self.discover_models(key) if key else self.__class__._discovered_models
        if not discovered:
            discovered = list(self.PREFERRED_FLASH_MODELS)

        candidates: List[str] = []

        # 1. Active working model if already proven
        if self.__class__._active_model and self.__class__._active_model not in self.__class__._unavailable_models:
            candidates.append(self.__class__._active_model)

        # 2. Configured model from settings
        if self.configured_model and self.configured_model not in self.__class__._unavailable_models:
            if self.configured_model not in candidates:
                candidates.append(self.configured_model)

        # 3. Discovered or fallback Flash models in order of preference
        for flash_pref in self.PREFERRED_FLASH_MODELS:
            if flash_pref in discovered and flash_pref not in self.__class__._unavailable_models:
                if flash_pref not in candidates:
                    candidates.append(flash_pref)

        # 4. Any remaining discovered models supporting generateContent
        for disc in discovered:
            if 'flash' in disc.lower() and disc not in self.__class__._unavailable_models:
                if disc not in candidates:
                    candidates.append(disc)

        # Final safety check
        if not candidates:
            candidates = ['gemini-3.5-flash', 'gemini-3.8-flash']

        return candidates

    def format_contents(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        max_turns: int = 6
    ) -> List[Dict]:
        """
        Formats conversational turns for the Gemini REST API payload.
        Gemini requires alternating 'user' and 'model' turns.
        Bounds history to the most recent max_turns.
        """
        contents: List[Dict] = []
        recent_history = (history or [])[-max_turns:]

        last_role = None
        for item in recent_history:
            raw_role = item.get('role', 'user')
            role = 'model' if raw_role in ('assistant', 'model') else 'user'
            text = (item.get('content') or item.get('message') or '').strip()

            if not text:
                continue

            # Skip consecutive identical roles to adhere to Gemini API constraints
            if role == last_role:
                continue

            contents.append({
                'role': role,
                'parts': [{'text': strip_emojis(text)}]
            })
            last_role = role

        # Append current user prompt
        if last_role == 'user' and contents:
            contents[-1]['parts'][0]['text'] += f"\n{strip_emojis(message)}"
        else:
            contents.append({
                'role': 'user',
                'parts': [{'text': strip_emojis(message)}]
            })

        return contents

    def _execute_http_request(self, key: str, model: str, payload: dict) -> Tuple[int, Optional[dict]]:
        """
        Executes raw HTTPS request to Gemini REST API.
        Never logs or exposes the actual key value.
        """
        url = f"{self.base_url}/{model}:generateContent?key={key}"
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        try:
            with urllib.request.urlopen(req, timeout=20) as response:
                status_code = response.getcode()
                body = json.loads(response.read().decode('utf-8'))
                return status_code, body
        except urllib.error.HTTPError as e:
            status_code = e.code
            try:
                error_body = json.loads(e.read().decode('utf-8'))
            except Exception:
                error_body = {'error': {'message': str(e), 'code': status_code}}
            return status_code, error_body
        except urllib.error.URLError as e:
            logger.warning("Network timeout or connection error calling Gemini API: %s", type(e).__name__)
            return 503, {'error': {'message': 'Network timeout', 'status': 'UNAVAILABLE'}}
        except Exception as e:
            logger.error("Unexpected error in Gemini HTTP request: %s", type(e).__name__)
            return 500, {'error': {'message': str(type(e).__name__), 'status': 'INTERNAL'}}

    def generate_response(
        self,
        message: str,
        language: str = 'en',
        history: Optional[List[Dict[str, str]]] = None
    ) -> Tuple[str, bool]:
        """
        Generates support response with automatic model fallback, key rotation,
        and graceful degradation.

        Returns:
            (response_text: str, is_refusal: bool)
        """
        if not self.api_keys:
            logger.warning("No GEMINI_API_KEYS configured. Returning graceful fallback.")
            return get_fallback_message(language), False

        total_keys = len(self.api_keys)
        system_instruction = get_system_prompt()
        contents = self.format_contents(message, history)

        payload = {
            'system_instruction': {
                'parts': [{'text': system_instruction}]
            },
            'contents': contents,
            'generationConfig': {
                'temperature': 0.2,
                'maxOutputTokens': 500,
            }
        }

        start_index = self.__class__._current_key_index

        for attempt in range(total_keys):
            key_index = (start_index + attempt) % total_keys
            active_key = self.api_keys[key_index]

            candidate_models = self.get_candidate_models(active_key)
            # Try at most 2 candidate models per key to avoid excessive requests
            models_to_try = candidate_models[:2]

            for model_attempt_idx, model in enumerate(models_to_try):
                status_code, response_data = self._execute_http_request(active_key, model, payload)

                # 1. SUCCESS (HTTP 200)
                if status_code == 200 and response_data:
                    self.__class__._current_key_index = key_index
                    self.__class__._active_model = model

                    try:
                        candidates = response_data.get('candidates', [])
                        if candidates:
                            parts = candidates[0].get('content', {}).get('parts', [])
                            raw_text = parts[0].get('text', '') if parts else ''
                            clean_text = strip_emojis(raw_text).strip()

                            # Check if response matches or implies a refusal
                            for ref in REFUSAL_MESSAGES.values():
                                if ref in clean_text:
                                    return get_refusal_message(language), True

                            if clean_text:
                                return clean_text, False
                    except Exception as parse_err:
                        logger.warning("Failed parsing Gemini response candidate: %s", parse_err)

                # Extract error diagnostics safely without logging the key
                err_dict = (response_data or {}).get('error', {})
                err_code = err_dict.get('code', status_code)
                err_status = err_dict.get('status', str(status_code))
                err_message = err_dict.get('message', 'No detail')

                # 2. MODEL NOT FOUND / DEPRECATED (HTTP 404)
                if status_code == 404:
                    logger.warning(
                        "Model '%s' returned HTTP 404 (%s: %s). Blacklisting model and falling back.",
                        model, err_status, err_message[:120]
                    )
                    self.__class__._unavailable_models.add(model)
                    # Try next candidate model on the same key!
                    continue

                # 3. HIGH DEMAND / TEMPORARY SERVER ISSUE (HTTP 503 / 504 / timeout)
                if status_code in (503, 504) or (status_code == 500 and 'timeout' in err_message.lower()):
                    logger.info(
                        "Temporary server capacity/timeout error (HTTP %d, status: %s) on model '%s', key #%d.",
                        status_code, err_status, model, key_index
                    )
                    # If another model is available for this key, try it; otherwise rotate key
                    if model_attempt_idx < len(models_to_try) - 1:
                        continue
                    break

                # 4. RATE LIMIT EXCEEDED (HTTP 429)
                if status_code == 429:
                    logger.info(
                        "Rate limit reached (HTTP 429) on key #%d (%s: %s). Rotating to next key.",
                        key_index, err_status, err_message[:120]
                    )
                    break  # Break model loop to rotate key

                # 5. PERMISSION / AUTHENTICATION RESTRICTION (HTTP 403 / 401)
                if status_code in (401, 403):
                    logger.warning(
                        "Authentication/permission error (HTTP %d, status: %s) on key #%d: %s. Rotating.",
                        status_code, err_status, key_index, err_message[:120]
                    )
                    break  # Break model loop to rotate key

                # 6. OTHER UNEXPECTED STATUS (e.g. 400 Bad Request)
                logger.warning(
                    "Gemini API error (HTTP %d, status: %s) on model '%s', key #%d: %s.",
                    status_code, err_status, model, key_index, err_message[:120]
                )
                break

            # Rotate class-level key index for next turn
            self.__class__._current_key_index = (key_index + 1) % total_keys

            # Bounded backoff between key rotations
            if attempt < total_keys - 1:
                sleep_time = 0.05 * (2 ** attempt) + random.uniform(0.01, 0.04)
                time.sleep(sleep_time)

        # All keys and fallback models failed -> Serve localized graceful degradation
        logger.error("All %d Gemini API keys failed or rate-limited. Serving graceful fallback.", total_keys)
        return get_fallback_message(language), False
