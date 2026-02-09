from django.urls import path
from . import views

urlpatterns = [
    path("sessions/", views.session_list, name="session-list"),
    path("sessions/<int:pk>/", views.session_detail, name="session-detail"),
    path("sessions/<int:pk>/messages/", views.session_messages, name="session-messages"),
    path("sessions/<int:pk>/query/", views.session_query, name="session-query"),
]
