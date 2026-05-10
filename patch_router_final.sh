#!/bin/bash
sed -i 's/case UserRole.GP: content = const GPDashboard(); break;/case UserRole.GP: content = const GPDashboard(); break;\n      case UserRole.TemplateClinical: content = const InternistDashboard(); break;\n      case UserRole.SpKJ: content = const PsychiatristDashboard(); break;\n      case UserRole.SpA: content = const PediatricsDashboard(); break;\n      case UserRole.Rheumatologist: content = const RheumatologyDashboard(); break;/' omni_med_nexus_os/ui_app/lib/dashboards/router.dart

sed -i 's/import '"'"'primary_care_dashboards.dart'"'"';/import '"'"'primary_care_dashboards.dart'"'"';\nimport '"'"'sensory_dashboards.dart'"'"';/' omni_med_nexus_os/ui_app/lib/dashboards/router.dart
