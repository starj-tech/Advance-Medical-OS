import 'package:flutter/material.dart';
import '../src/rust/api.dart';

class PathologyDashboard extends StatefulWidget {
  const PathologyDashboard({super.key});
  @override
  State<PathologyDashboard> createState() => _PathologyDashboardState();
}

class _PathologyDashboardState extends State<PathologyDashboard> {
  String _ai = "Scanning Slide...";
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  void _loadData() async {
    final res = await countMitosisAi(slideHash: "slide_001");
    setState(() => _ai = res);
  }
  @override
  Widget build(BuildContext context) {
    return Center(child: Text(_ai, style: const TextStyle(fontSize: 20, color: Colors.purpleAccent)));
  }
}

class ForensicsDashboard extends StatefulWidget {
  const ForensicsDashboard({super.key});
  @override
  State<ForensicsDashboard> createState() => _ForensicsDashboardState();
}

class _ForensicsDashboardState extends State<ForensicsDashboard> {
  String _visum = "Generating Visum...";
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  void _loadData() async {
    final res = await generateVisum(patientId: "PID_404", injury: "Blunt force trauma to the cranium");
    setState(() => _visum = res);
  }
  @override
  Widget build(BuildContext context) {
    return Center(child: Text(_visum, style: const TextStyle(fontSize: 16, fontFamily: 'monospace', color: Colors.greenAccent)));
  }
}
