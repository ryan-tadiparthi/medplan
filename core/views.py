from django.shortcuts import render, redirect
from django.http import HttpResponse
from .forms import PrescriptionForm
from .models import Prescription, Medication
from django.contrib.auth.decorators import login_required
import os
import requests
from dotenv import load_dotenv
from .services.prescription_analyzer import analyze_prescription

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
                    extracted_text = (
                        result['ParsedResults'][0]['ParsedText']
                    )

                    prescription.extracted_text = extracted_text
                    prescription.save()

                    try:
                        analysis = analyze_prescription(extracted_text)

                        print("ANALYSIS:", analysis)

                        for medication in analysis.get('medications', []):
                            print("CREATING MEDICATION:", medication)
                            Medication.objects.create(
                                prescription=prescription,
                                name=medication.get('name', ''),
                                strength=medication.get('strength', ''),
                                dosage=medication.get('dosage', ''),
                                frequency=medication.get('frequency', ''),
                                timing=medication.get('timing', ''),
                                instructions=medication.get('instructions', '')
                            )

                    except Exception as e:
                        print("Prescription analysis failed:", e)
                        raise

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
    ).prefetch_related('medications').order_by('-uploaded_at')

    return render(request, 'core/my_prescriptions.html', {'prescriptions': prescriptions})