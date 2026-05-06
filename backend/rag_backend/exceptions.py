from rest_framework.views import exception_handler


AUTH_ERROR_MESSAGE = "Your session has expired. Please log in again."
GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again."
THROTTLE_ERROR_MESSAGE = "Too many requests. Please wait a moment and try again."


def safe_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None

    if response.status_code == 429:
        response.data = {"detail": THROTTLE_ERROR_MESSAGE}
    elif response.status_code in (401, 403):
        response.data = {"detail": AUTH_ERROR_MESSAGE}
    elif response.status_code >= 500:
        response.data = {"detail": GENERIC_ERROR_MESSAGE}

    return response
