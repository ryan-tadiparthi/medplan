from django.shortcuts import render, redirect
from django.contrib.auth import login
from .forms import RegisterForm, HealthProfileForm
from .models import HealthProfile
from django.contrib import messages
from django.contrib.auth.decorators import login_required

def register(request):

    if request.method == "POST":

        form = RegisterForm(request.POST)

        if form.is_valid():

            form.save()

            username = form.cleaned_data.get('username')

            messages.success(request, f"You registered as {username}")

            return redirect('login')

    else:

        form = RegisterForm()

    return render(request, 'users/register.html', {"form": form})


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

            messages.success(request, "Health profile saved successfully!")

            return redirect('my-prescriptions')

    else:

        form = HealthProfileForm(instance=profile)

    return render(
        request,
        'users/health_profile.html',
        {'form': form}
    )