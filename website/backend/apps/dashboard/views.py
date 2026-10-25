from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.common.responses import data_response

from .services import get_dashboard


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return data_response(get_dashboard(request.user))
