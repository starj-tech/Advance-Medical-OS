#!/bin/bash
sed -i 's/import '"'"'sensory_dashboards.dart'"'"';/import '"'"'sensory_dashboards.dart'"'"';\nimport '"'"'internal_med_dashboards.dart'"'"';/' omni_med_nexus_os/ui_app/lib/dashboards/router.dart

sed -i 's/      default: content = Center(child: Text("${user.role.name} Dashboard Workspace"));/      case UserRole.Endocrinologist: content = const EndocrinologyDashboard(); break;\n      case UserRole.Pulmonologist: content = const PulmonologyDashboard(); break;\n      case UserRole.Gastroenterologist: content = const GastroenterologyDashboard(); break;\n      case UserRole.Pharmacy: content = const PharmacyDashboard(); break;\n      default: content = Center(child: Text("${user.role.name} Dashboard Workspace"));/' omni_med_nexus_os/ui_app/lib/dashboards/router.dart
