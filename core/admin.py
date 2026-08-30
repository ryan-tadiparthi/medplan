from django.contrib import admin
from .models import Prescription, Medication

admin.site.register(Prescription)
admin.site.register(Medication)