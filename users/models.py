from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):

    ROLE_CHOICES = [
        ('patient', 'Patient'),
        ('guardian', 'Guardian'),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile'
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='patient'
    )

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"


class GuardianAccess(models.Model):

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]

    guardian = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='guardian_requests'
    )

    patient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='patient_guardians'
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return (
            f"{self.guardian.username} → "
            f"{self.patient.username} ({self.status})"
        )


class GuardianInvitation(models.Model):

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('expired', 'Expired'),
    ]

    patient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='guardian_invitations'
    )

    guardian_name = models.CharField(
        max_length=150
    )

    guardian_email = models.EmailField()

    guardian_phone = models.CharField(
        max_length=20
    )

    custom_message = models.TextField(
        blank=True
    )

    token = models.CharField(
        max_length=100,
        unique=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return (
            f"Invitation from {self.patient.username} "
            f"to {self.guardian_email}"
        )



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