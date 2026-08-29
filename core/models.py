from django.db import models
from django.conf import settings

# Create your models here.
class Prescription(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE
    )
    image = models.ImageField(upload_to='prescriptions/')
    extracted_text = models.TextField(blank=True)
    description = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)