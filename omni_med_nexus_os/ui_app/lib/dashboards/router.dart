import 'package:flutter/material.dart';
import '../src/rust/api.dart';
import 'er_dashboard.dart';
import 'neuro_dashboard.dart';

class RoleDashboardRouter extends StatelessWidget {
  final UserProfile user;
  const RoleDashboardRouter({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    Widget content;
    switch (user.role) {
      case UserRole.SpEM: content = const ERDashboard(); break;
      case UserRole.SpBS: content = const NeuroDashboard(); break;
      case UserRole.Intensivist: content = const Center(child: Text("Intensivist (ICU) Dashboard Placeholder")); break;
      case UserRole.SpAn: content = const Center(child: Text("Anesthesiologist Dashboard Placeholder")); break;
      case UserRole.SpOT: content = const Center(child: Text("Orthopedic Pre-Op Templating Placeholder")); break;
      case UserRole.SpBKV: content = const Center(child: Text("Cardiac Surgeon Hemodynamic Placeholder")); break;
      case UserRole.SpKJ: content = const Center(child: Text("Psychiatrist Therapy Notes Placeholder")); break;
      // Operational & Holding
      case UserRole.CFO: content = const Center(child: Text("CFO Revenue Guard Placeholder")); break;
      case UserRole.GroupAuditor: content = const Center(child: Text("Global Auditor Blockchain Placeholder")); break;
      default: content = Center(child: Text("${user.role.name} Dashboard Placeholder"));
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('${user.name} - Workspace', style: const TextStyle(color: Colors.tealAccent)),
        backgroundColor: const Color(0xFF1E293B),
        actions: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            alignment: Alignment.center,
            child: const Text("AES-256-GCM Secured", style: TextStyle(color: Colors.greenAccent, fontSize: 12)),
          )
        ],
      ),
      body: content,
    );
  }
}
