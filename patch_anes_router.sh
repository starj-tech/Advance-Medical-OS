#!/bin/bash
sed -i 's/case UserRole.SpAn: content = const Center(child: Text("Anesthesiologist Dashboard Placeholder")); break;/case UserRole.SpAn: content = const AnesthesiologyDashboard(); break;/' omni_med_nexus_os/ui_app/lib/dashboards/router.dart
sed -i 's/import '"'"'radio_dashboard.dart'"'"';/import '"'"'radio_dashboard.dart'"'"';\nimport '"'"'anes_dashboard.dart'"'"';/' omni_med_nexus_os/ui_app/lib/dashboards/router.dart
