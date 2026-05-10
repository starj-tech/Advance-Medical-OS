import 'package:flutter/material.dart';
import '../src/rust/api.dart';

class OphthalmologyDashboard extends StatefulWidget {
  const OphthalmologyDashboard({super.key});
  @override
  State<OphthalmologyDashboard> createState() => _OphthalmologyDashboardState();
}

class _OphthalmologyDashboardState extends State<OphthalmologyDashboard> {
  String _oct = "Analyzing OCT...";
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  void _loadData() async {
    final res = await detectRetinopathy(octImageHash: "diab_scan_01");
    setState(() => _oct = res);
  }
  @override
  Widget build(BuildContext context) {
    return Center(child: Text(_oct, style: const TextStyle(fontSize: 20, color: Colors.orange)));
  }
}

class DermatologyDashboard extends StatefulWidget {
  const DermatologyDashboard({super.key});
  @override
  State<DermatologyDashboard> createState() => _DermatologyDashboardState();
}

class _DermatologyDashboardState extends State<DermatologyDashboard> {
  String _ai = "Analyzing Skin Image...";
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  void _loadData() async {
    final res = await analyzeSkinLesion(imageHash: "melanoma_scan_01");
    setState(() => _ai = res);
  }
  @override
  Widget build(BuildContext context) {
    return Center(child: Text(_ai, style: const TextStyle(fontSize: 20, color: Colors.red)));
  }
}
