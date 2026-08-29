from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('upload-prescription/', views.upload_prescription, name='upload_prescription'),
    path('my-prescriptions/', views.my_prescriptions, name='my_prescriptions'),
]