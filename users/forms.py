from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User

from .models import HealthProfile, UserProfile, GuardianInvitation


class RegisterForm(UserCreationForm):

    email = forms.EmailField(
        required=True
    )

    role = forms.ChoiceField(
        choices=UserProfile.ROLE_CHOICES,
        widget=forms.RadioSelect,
        required=True
    )

    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'password1',
            'password2',
            'role'
        ]


class GuardianInvitationForm(forms.ModelForm):

    class Meta:
        model = GuardianInvitation

        fields = [
            'guardian_name',
            'guardian_phone',
            'guardian_email',
            'custom_message'
        ]

        widgets = {
            'guardian_name': forms.TextInput(
                attrs={
                    'placeholder': 'Enter guardian name'
                }
            ),

            'guardian_phone': forms.TextInput(
                attrs={
                    'placeholder': 'Enter guardian phone number'
                }
            ),

            'guardian_email': forms.EmailInput(
                attrs={
                    'placeholder': 'Enter guardian email'
                }
            ),

            'custom_message': forms.Textarea(
                attrs={
                    'placeholder': 'Write a message to your guardian...',
                    'rows': 4
                }
            ),
        }

    def clean_guardian_phone(self):

        phone = self.cleaned_data['guardian_phone']

        # Remove spaces, hyphens and parentheses
        cleaned_phone = (
            phone
            .replace(' ', '')
            .replace('-', '')
            .replace('(', '')
            .replace(')', '')
        )

        # Allow an optional + at the beginning
        if cleaned_phone.startswith('+'):
            digits = cleaned_phone[1:]
        else:
            digits = cleaned_phone

        if not digits.isdigit():
            raise forms.ValidationError(
                "Please enter a valid phone number."
            )

        if len(digits) < 10 or len(digits) > 15:
            raise forms.ValidationError(
                "Please enter a valid phone number."
            )

        return cleaned_phone

class HealthProfileForm(forms.ModelForm):

    class Meta:
        model = HealthProfile
        fields = [
            'full_name',
            'age',
            'height',
            'weight',
            'allergies',
            'existing_conditions',
            'systolic',
            'diastolic',
            'blood_sugar',
        ]