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

class Medication(models.Model):

    prescription = models.ForeignKey(
        Prescription,
        on_delete=models.CASCADE,
        related_name='medications'
    )

    name = models.CharField(max_length=200)

    strength = models.CharField(max_length=100, blank=True)

    dosage = models.CharField(max_length=100, blank=True)

    frequency = models.CharField(max_length=100, blank=True)

    timing = models.CharField(max_length=100, blank=True)

    instructions = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name