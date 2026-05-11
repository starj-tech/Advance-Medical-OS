#!/bin/bash
cat << 'INNER_EOF' > omni_med_nexus_os/ui_app/lib/dashboards/router.dart
import 'package:flutter/material.dart';
import '../src/rust/api.dart';
import '../design/pulse_theme.dart';
import '../design/glassmorphism.dart';
import '../design/neumorphism.dart';
import 'er_dashboard.dart';
import 'neuro_dashboard.dart';
import 'icu_dashboard.dart';
import 'cardio_dashboard.dart';
import 'onco_dashboard.dart';
import 'obgyn_dashboard.dart';
import 'radio_dashboard.dart';
import 'primary_care_dashboards.dart';
import 'surgery_dashboards.dart';
import 'sensory_dashboards.dart';
import 'diagnostics_dashboards.dart';
import 'internal_med_dashboards.dart';
import 'anes_dashboard.dart';
import 'ortho_dashboard.dart';

class RoleDashboardRouter extends StatefulWidget {
  final UserProfile user;
  const RoleDashboardRouter({super.key, required this.user});

  @override
  State<RoleDashboardRouter> createState() => _RoleDashboardRouterState();
}

class _RoleDashboardRouterState extends State<RoleDashboardRouter> {
  int _navIndex = 0;

  Widget _getDashboardContent() {
    switch (widget.user.role) {
      case UserRole.SpEM: return const ERDashboard();
      case UserRole.SpBS: return const NeuroDashboard();
      case UserRole.Intensivist: return const IcuDashboard();
      case UserRole.Cardiologist: return const CardioDashboard();
      case UserRole.Oncologist: return const OncoDashboard();
      case UserRole.SpOG: return const ObgynDashboard();
      case UserRole.Radiologist: return const RadioDashboard();
      case UserRole.GP: return const GPDashboard();
      case UserRole.TemplateClinical: return const InternistDashboard();
      case UserRole.SpKJ: return const PsychiatristDashboard();
      case UserRole.SpA: return const PediatricsDashboard();
      case UserRole.Rheumatologist: return const RheumatologyDashboard();
      case UserRole.SpAn: return const AnesthesiologyDashboard();
      case UserRole.SpOT: return const OrthopedicDashboard();
      case UserRole.Endocrinologist: return const EndocrinologyDashboard();
      case UserRole.Pulmonologist: return const EnhancedPulmonologyDashboard();
      case UserRole.Gastroenterologist: return const GastroenterologyDashboard();
      case UserRole.Pharmacy: return const PharmacyDashboard();
      case UserRole.Urologist: return const UrologyDashboard();
      case UserRole.PlasticSurgeon: return const PlasticSurgeryDashboard();
      case UserRole.VascularSurgeon: return const VascularDashboard();
      case UserRole.SpM: return const EnhancedOphthalmologyDashboard();
      case UserRole.SpKK: return const DermatologyDashboard();
      case UserRole.SpPA: return const PathologyDashboard();
      case UserRole.ForensicMed: return const ForensicsDashboard();
      case UserRole.CFO: return const ExecDashboard();
      default: return Center(child: Text("${widget.user.role.name} Workspace", style: const TextStyle(color: Colors.white)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        bool isMobile = constraints.maxWidth < 800;

        if (isMobile) {
          return Scaffold(
            body: Container(
              decoration: PulseTheme.mobileBackground,
              child: SafeArea(
                child: Column(
                  children: [
                    // Mobile Top Bar
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(widget.user.name, style: const TextStyle(color: Colors.black87, fontSize: 18, fontWeight: FontWeight.bold)),
                          const Icon(Icons.menu, color: Colors.black54),
                        ],
                      ),
                    ),
                    // Central Circular Focus
                    Container(
                      height: 150, width: 150,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white, boxShadow: [BoxShadow(color: Colors.grey.shade400, blurRadius: 10)]),
                      child: const Center(child: Icon(Icons.favorite, color: Colors.pinkAccent, size: 80)),
                    ),
                    const SizedBox(height: 20),
                    // Neumorphic Content Wrap
                    Expanded(
                      child: NeumorphicCard(
                        child: _getDashboardContent(),
                      ),
                    )
                  ],
                ),
              ),
            ),
            floatingActionButton: FloatingActionButton(
              backgroundColor: PulseTheme.deepPurpleEnd,
              onPressed: () {},
              child: const Icon(Icons.add, color: Colors.white),
            ),
          );
        } else {
          // Desktop Layout with Side Navigation Rail and Glassmorphism
          return Scaffold(
            body: Container(
              decoration: PulseTheme.desktopBackground,
              child: Row(
                children: [
                  NavigationRail(
                    backgroundColor: Colors.black.withOpacity(0.3),
                    unselectedIconTheme: const IconThemeData(color: Colors.white54),
                    selectedIconTheme: const IconThemeData(color: Colors.tealAccent),
                    destinations: const [
                      NavigationRailDestination(icon: Icon(Icons.dashboard), label: Text("Cockpit")),
                      NavigationRailDestination(icon: Icon(Icons.people), label: Text("Patients")),
                      NavigationRailDestination(icon: Icon(Icons.analytics), label: Text("Analytics")),
                    ],
                    selectedIndex: _navIndex,
                    onDestinationSelected: (idx) => setState(() => _navIndex = idx),
                  ),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: GlassPanel(
                        child: _getDashboardContent(),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        }
      },
    );
  }
}
INNER_EOF
