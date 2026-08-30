from django.contrib import admin
from .models import HealthProfile, UserProfile, GuardianAccess, GuardianInvitation

# Register your models here.
admin.site.register(HealthProfile)
admin.site.register(UserProfile)
admin.site.register(GuardianAccess)
admin.site.register(GuardianInvitation)