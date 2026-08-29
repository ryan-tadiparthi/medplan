from django.shortcuts import render, redirect
from django.http import HttpResponse
from .forms import PrescriptionForm
from .models import Prescription
from django.contrib.auth.decorators import login_required
import os
import requests
from dotenv import load_dotenv

load_dotenv()

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

            try:
                api_key = os.getenv('OCR_API_KEY')

                with open(prescription.image.path, 'rb') as image:
                    response = requests.post(
                        'https://api.ocr.space/parse/image',
                        headers={
                            'apikey': api_key
                        },
                        files={
                            'file': image
                        },
                        data={
                            'language': 'auto',
                            'OCREngine': '3'
                        },
                        timeout=30
                    )

                result = response.json()

                if not result.get('IsErroredOnProcessing'):
                    prescription.extracted_text = (
                        result['ParsedResults'][0]['ParsedText']
                    )
                    prescription.save()

            except Exception as e:
                print("OCR failed:", e)

            return redirect('home')

    else:
        form = PrescriptionForm()

    return render(request, 'core/upload_prescription.html', {'form': form})


@login_required
def my_prescriptions(request):
    prescriptions = Prescription.objects.filter(
        user=request.user
    ).order_by('-id')

    return render(request, 'core/my_prescriptions.html', {'prescriptions': prescriptions})