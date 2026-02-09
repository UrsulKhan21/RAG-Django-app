from django.urls import path
from . import views

urlpatterns = [
    path("", views.source_list, name="source-list"),
    path("<int:pk>/", views.source_detail, name="source-detail"),
    path("<int:pk>/ingest/", views.source_ingest, name="source-ingest"),
    path("<int:pk>/sync/", views.source_sync, name="source-sync"),
]
