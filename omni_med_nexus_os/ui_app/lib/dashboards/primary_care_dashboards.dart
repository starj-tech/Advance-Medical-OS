import 'package:flutter/material.dart';
import '../src/rust/api.dart';

class GPDashboard extends StatelessWidget {
  const GPDashboard({super.key});
  @override
  Widget build(BuildContext context) {
    return const Center(child: Text("GP: High-Velocity Triage & Referral", style: TextStyle(fontSize: 20, color: Colors.blueAccent)));
  }
}

class FamilyPhysicianDashboard extends StatelessWidget {
  const FamilyPhysicianDashboard({super.key});
  @override
  Widget build(BuildContext context) {
    return const Center(child: Text("Family Physician: Longitudinal Care & Family Tree", style: TextStyle(fontSize: 20, color: Colors.teal)));
  }
}

class OccupationalDashboard extends StatefulWidget {
  const OccupationalDashboard({super.key});
  @override
  State<OccupationalDashboard> createState() => _OccupationalDashboardState();
}

class _OccupationalDashboardState extends State<OccupationalDashboard> {
  String _fitStatus = "Running Audiometry Mock...";
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  void _loadData() async {
    final res = await fitToWorkAssessment(hearingDb: 45, visionAcuity: "20/20");
    setState(() => _fitStatus = res);
  }
  @override
  Widget build(BuildContext context) {
    return Center(child: Text(_fitStatus, style: const TextStyle(fontSize: 20, color: Colors.orange)));
  }
}
