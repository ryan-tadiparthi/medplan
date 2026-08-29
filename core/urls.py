from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('upload-prescription/', views.upload_prescription, name='upload_prescription'),
]