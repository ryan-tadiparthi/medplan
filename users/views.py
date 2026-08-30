from django.shortcuts import render, redirect
from django.contrib.auth import login
from .forms import RegisterForm, HealthProfileForm, GuardianInvitationForm
from .models import HealthProfile, UserProfile, GuardianInvitation, GuardianAccess
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate
from django.contrib.auth.forms import AuthenticationForm
import secrets
from django.core.mail import send_mail
from django.urls import reverse
from django.conf import settings


def register(request):

    invitation_token = request.GET.get('invitation')

    invitation = None

    if invitation_token:

        try:
            invitation = GuardianInvitation.objects.get(
                token=invitation_token,
                status='pending'
            )
        except GuardianInvitation.DoesNotExist:
            messages.error(
                request,
                "This guardian invitation is invalid or has already been used."
            )

    if request.method == "POST":

        form = RegisterForm(request.POST)

        if form.is_valid():

            user = form.save()

            role = form.cleaned_data['role']

            UserProfile.objects.create(
                user=user,
                role=role
            )

            # If this registration came from a guardian invitation
            if invitation and role == 'guardian':

                GuardianAccess.objects.create(
                    guardian=user,
                    patient=invitation.patient,
                    status='pending'
                )

                invitation.status = 'accepted'
                invitation.save()

            messages.success(
                request,
                f"You registered as {user.username}"
            )

            return redirect('login')

    else:

        form = RegisterForm()

    return render(
        request,
        'users/register.html',
        {
            'form': form,
            'invitation': invitation
        }
    )


@login_required
def health_profile(request):

    try:
        profile = request.user.health_profile
    except HealthProfile.DoesNotExist:
        profile = None

    if request.method == "POST":

        form = HealthProfileForm(request.POST, instance=profile)

        if form.is_valid():

            health_profile = form.save(commit=False)
            health_profile.user = request.user
            health_profile.save()

            messages.success(
                request,
                "Health profile saved successfully!"
            )

            return redirect('my_prescriptions')

    else:

        form = HealthProfileForm(instance=profile)

    return render(
        request,
        'users/health_profile.html',
        {'form': form}
    )


@login_required
def send_guardian_invitation(request):

    if request.user.profile.role != "patient":
        return redirect('guardian_dashboard')

    if request.method == "POST":

        form = GuardianInvitationForm(request.POST)

        if form.is_valid():

            invitation = form.save(commit=False)

            # Automatically associate invitation with logged-in patient
            invitation.patient = request.user

            # Generate a secure unique invitation token
            invitation.token = secrets.token_urlsafe(32)

            invitation.save()

            # Create links for the guardian
            create_account_link = request.build_absolute_uri(
                f'/register/?invitation={invitation.token}'
            )

            decline_link = request.build_absolute_uri(
                f'/guardian-invitation/{invitation.token}/decline/'
            )

            # Email subject
            subject = (
                f"{request.user.username} invited you "
                f"to become their MedPlan Guardian"
            )

            # Email body
            message = f"""
Hello {invitation.guardian_name},

{request.user.username} has invited you to become their
guardian on MedPlan.

Message from {request.user.username}:

{invitation.custom_message}

Create your Guardian account:
{create_account_link}

Decline this invitation:
{decline_link}

Please do not share these links with anyone else.

Thank you,
MedPlan
"""

            # Send email
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [invitation.guardian_email],
                fail_silently=False,
            )

            messages.success(
                request,
                f"Guardian invitation sent to "
                f"{invitation.guardian_email}!"
            )

            return redirect('my_prescriptions')

    else:

        form = GuardianInvitationForm()

    return render(
        request,
        'users/guardian_invitation.html',
        {'form': form}
    )


@login_required
def guardian_dashboard(request):

    if request.user.profile.role != "guardian":
        return redirect('my_prescriptions')

    return render(
        request,
        'users/guardian_dashboard.html'
    )

def user_login(request):

    if request.method == "POST":

        form = AuthenticationForm(
            request,
            data=request.POST
        )

        if form.is_valid():

            user = form.get_user()

            login(request, user)

            if user.profile.role == "guardian":
                return redirect('guardian_dashboard')

            return redirect('my_prescriptions')

    else:

        form = AuthenticationForm()

    return render(
        request,
        'users/login.html',
        {'form': form}
    )