from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle, UserRateThrottle


class BurstAnonThrottle(AnonRateThrottle):
    scope = "anon"


class BurstUserThrottle(UserRateThrottle):
    scope = "user"


class LoginRateThrottle(ScopedRateThrottle):
    scope = "login"


class RegisterRateThrottle(ScopedRateThrottle):
    scope = "register"


class RefreshRateThrottle(ScopedRateThrottle):
    scope = "refresh"


class ChatQueryRateThrottle(ScopedRateThrottle):
    scope = "chat_query"


class SourceWriteRateThrottle(ScopedRateThrottle):
    scope = "source_write"
