import 'package:flutter/material.dart';
import '../src/rust/api.dart';
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

class RoleDashboardRouter extends StatelessWidget {
  final UserProfile user;
  const RoleDashboardRouter({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    Widget content;
    switch (user.role) {
      // High-Stakes & Core
      case UserRole.SpEM: content = const ERDashboard(); break;
      case UserRole.SpBS: content = const NeuroDashboard(); break;
      case UserRole.Intensivist: content = const IcuDashboard(); break;
      case UserRole.Cardiologist: content = const CardioDashboard(); break;
      case UserRole.Oncologist: content = const OncoDashboard(); break;
      case UserRole.SpOG: content = const ObgynDashboard(); break;
      case UserRole.Radiologist: content = const RadioDashboard(); break;

      // Primary Care
      case UserRole.GP: content = const GPDashboard(); break;
      case UserRole.FamilyPhysician: content = const FamilyPhysicianDashboard(); break;
      case UserRole.SpOk: content = const OccupationalDashboard(); break;

      // Surgery Sub-specialties
      case UserRole.Urologist: content = const UrologyDashboard(); break;
      case UserRole.PlasticSurgeon: content = const PlasticSurgeryDashboard(); break;
      case UserRole.VascularSurgeon: content = const VascularDashboard(); break;

      // Sensory Organs
      case UserRole.SpM: content = const OphthalmologyDashboard(); break;
      case UserRole.SpKK: content = const DermatologyDashboard(); break;

      // Diagnostics & Forensics
      case UserRole.SpPA: content = const PathologyDashboard(); break;
      case UserRole.ForensicMed: content = const ForensicsDashboard(); break;

      // Operational & Holding
      case UserRole.CFO: content = const ExecDashboard(); break;
      case UserRole.GroupAuditor: content = const Center(child: Text("Global Auditor Blockchain Placeholder")); break;

      default: content = Center(child: Text("${user.role.name} Dashboard Workspace"));
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('${user.name} - Workspace', style: const TextStyle(color: Colors.tealAccent)),
        backgroundColor: const Color(0xFF1E293B),
        actions: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            alignment: Alignment.center,
            child: const Text("Zero-Knowledge Secured", style: TextStyle(color: Colors.greenAccent, fontSize: 12)),
          )
        ],
      ),
      body: content,
    );
  }
}
// Executive Dashboard implementation with NexusConnect Shadow Migration status
class ExecDashboard extends StatefulWidget {
  const ExecDashboard({super.key});
  @override
  State<ExecDashboard> createState() => _ExecDashboardState();
}

class _ExecDashboardState extends State<ExecDashboard> {
  String _migrationStatus = "Loading migration status...";
  List<String> _hardware = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() async {
    initializeHardwareGateways();
    final migration = await getShadowMigrationStatus();
    final hw = await getAllHardwareSummary();
    setState(() {
      _migrationStatus = migration;
      _hardware = hw;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: ListView(
        children: [
          const Text("CFO/CEO Operations", style: TextStyle(fontSize: 24, color: Colors.blueAccent)),
          const SizedBox(height: 20),
          Card(
            color: Colors.blueGrey.shade800,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("The Great Migration (ETL Engine)", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 10),
                  Text(_migrationStatus, style: const TextStyle(color: Colors.greenAccent)),
                  const SizedBox(height: 20),
                  const Text("NexusConnect Fleet Connectivity", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 10),
                  ..._hardware.map((h) => Text(h, style: const TextStyle(color: Colors.cyanAccent, fontFamily: 'monospace'))).toList(),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }
}
