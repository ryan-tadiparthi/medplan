from django.db import models
from django.contrib.auth.models import User


class HealthProfile(models.Model):

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='health_profile'
    )

    full_name = models.CharField(max_length=150)

    age = models.PositiveIntegerField()

    height = models.DecimalField(
        max_digits=5,
        decimal_places=2
    )

    weight = models.DecimalField(
        max_digits=5,
        decimal_places=2
    )

    allergies = models.TextField(blank=True)

    existing_conditions = models.TextField(blank=True)

    systolic = models.PositiveIntegerField()

    diastolic = models.PositiveIntegerField()

    blood_sugar = models.DecimalField(
        max_digits=6,
        decimal_places=2
    )

    def __str__(self):
        return f"{self.user.username}'s Health Profile"