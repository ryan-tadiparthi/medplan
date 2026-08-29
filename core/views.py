from django.shortcuts import render, redirect
from django.http import HttpResponse
from .forms import PrescriptionForm
from django.contrib.auth.decorators import login_required

def home(request):
    return render(request, 'core/home.html', {})

@login_required
def upload_prescription(request):
    if request.method == 'POST':
        form = PrescriptionForm(request.POST, request.FILES)

        if form.is_valid():
            prescription = form.save(commit=False)
            prescription.user = request.user
            prescription.save()

            return redirect('home')

    else:
        form = PrescriptionForm()

    return render(request, 'core/upload_prescription.html', {'form': form})