import os
from pathlib import Path
from datetime import timedelta
import dj_database_url
from dotenv import load_dotenv


load_dotenv()



BASE_DIR = Path(__file__).resolve().parent.parent


def parse_csv_env(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


def get_bool_env(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() == "true"

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "change-me-in-production")

DEBUG = get_bool_env("DEBUG", True)

if not DEBUG and SECRET_KEY == "change-me-in-production":
    raise ValueError("Set DJANGO_SECRET_KEY in production.")

ALLOWED_HOSTS = parse_csv_env("ALLOWED_HOSTS", "localhost,127.0.0.1")
if DEBUG:
    # Local-network testing is much easier if Django accepts requests from the laptop IP too.
    ALLOWED_HOSTS = ["*"]

# =========================================================
# INSTALLED APPS
# =========================================================

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "corsheaders",
    "rest_framework",
    # Local apps
    "accounts",
    "sources",
    "chat",
    'django.contrib.sites',
    'rest_framework.authtoken',
    'dj_rest_auth',
    'dj_rest_auth.registration',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    
]

# =========================================================
# MIDDLEWARE
# =========================================================

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",

]

ROOT_URLCONF = "rag_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "rag_backend.wsgi.application"


SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': ['profile', 'email'],
        'AUTH_PARAMS': {'access_type': 'online'},
    }
}
# =========================================================
# DATABASE
# =========================================================

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=int(os.getenv("DB_CONN_MAX_AGE", "60")),
            ssl_require=os.getenv("DB_SSL_REQUIRE", "True").lower() == "true",
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# =========================================================
# AUTH
# =========================================================

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# =========================================================
# CORS (for Next.js frontend)
# =========================================================

FRONTEND_URLS = parse_csv_env("FRONTEND_URLS", os.getenv("FRONTEND_URL", "http://localhost:3000"))
FRONTEND_URL = FRONTEND_URLS[0]

CORS_ALLOWED_ORIGINS = FRONTEND_URLS

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = FRONTEND_URLS

COOKIE_SECURE = get_bool_env("COOKIE_SECURE", not DEBUG)
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "Lax" if DEBUG else "None")
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN", "").strip() or None

SESSION_COOKIE_SECURE = COOKIE_SECURE
SESSION_COOKIE_SAMESITE = COOKIE_SAMESITE
SESSION_COOKIE_DOMAIN = COOKIE_DOMAIN
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_SECURE = COOKIE_SECURE
CSRF_COOKIE_SAMESITE = COOKIE_SAMESITE
CSRF_COOKIE_DOMAIN = COOKIE_DOMAIN
CSRF_COOKIE_HTTPONLY = False

# =========================================================
# Google OAuth
# =========================================================

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "http://localhost:8000/api/auth/google/callback/",
)

# =========================================================
# RAG Configuration
# =========================================================

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")

EMBED_MODEL_NAME = os.getenv("EMBED_MODEL_NAME", "gemini-embedding-001")
EMBED_DIM = int(os.getenv("EMBED_DIM", "768"))

LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "768"))
LLM_MAX_CONTEXT_CHARS = int(os.getenv("LLM_MAX_CONTEXT_CHARS", "6500"))
LLM_MAX_CONTEXT_CHARS_PER_CHUNK = int(os.getenv("LLM_MAX_CONTEXT_CHARS_PER_CHUNK", "1400"))
LLM_MAX_HISTORY_CHARS = int(os.getenv("LLM_MAX_HISTORY_CHARS", "1200"))
RAG_MAX_TOP_K = int(os.getenv("RAG_MAX_TOP_K", "4"))
EMBED_BATCH_SIZE = int(os.getenv("EMBED_BATCH_SIZE", "8"))

DATA_UPLOAD_MAX_MEMORY_SIZE = int(os.getenv("DATA_UPLOAD_MAX_MEMORY_SIZE", str(100 * 1024 * 1024)))
FILE_UPLOAD_MAX_MEMORY_SIZE = int(os.getenv("FILE_UPLOAD_MAX_MEMORY_SIZE", str(100 * 1024 * 1024)))

# =========================================================
# REST FRAMEWORK
# =========================================================

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "accounts.authentication.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_THROTTLE_CLASSES": (
        "rag_backend.throttles.BurstAnonThrottle",
        "rag_backend.throttles.BurstUserThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.getenv("THROTTLE_ANON_RATE", "120/minute"),
        "user": os.getenv("THROTTLE_USER_RATE", "600/minute"),
        "login": os.getenv("THROTTLE_LOGIN_RATE", "10/minute"),
        "register": os.getenv("THROTTLE_REGISTER_RATE", "5/hour"),
        "refresh": os.getenv("THROTTLE_REFRESH_RATE", "30/minute"),
        "chat_query": os.getenv("THROTTLE_CHAT_QUERY_RATE", "120/minute"),
        "source_write": os.getenv("THROTTLE_SOURCE_WRITE_RATE", "100/hour"),
    },
    "EXCEPTION_HANDLER": "rag_backend.exceptions.safe_exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
}

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = get_bool_env("SECURE_SSL_REDIRECT", True)
    SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = get_bool_env("SECURE_HSTS_INCLUDE_SUBDOMAINS", True)
    SECURE_HSTS_PRELOAD = get_bool_env("SECURE_HSTS_PRELOAD", False)
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = "DENY"
    SECURE_REFERRER_POLICY = "same-origin"
    USE_X_FORWARDED_HOST = True
    SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"

# =========================================================
# INTERNATIONALIZATION
# =========================================================
  # for development only

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
SITE_ID = 1

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
