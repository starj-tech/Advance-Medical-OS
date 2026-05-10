#!/bin/bash
sed -i 's/case UserRole.CFO: content = const Center(child: Text("CFO Revenue Guard Placeholder")); break;/case UserRole.CFO: content = const ExecDashboard(); break;/' omni_med_nexus_os/ui_app/lib/dashboards/router.dart
