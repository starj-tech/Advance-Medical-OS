import 'package:flutter/material.dart';
import '../src/rust/api.dart';
import 'primary_care_dashboards.dart'; // for buildPaywall

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
    final res = await analyzeSkinLesionLicensed(imageHash: "melanoma_scan_01");
    setState(() => _ai = res);
  }
  @override
  Widget build(BuildContext context) {
    if (_ai.contains("PAYWALL")) return buildPaywall(_ai);
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          const Text("Dermatology: AI Skin Lesion Analyzer", style: TextStyle(fontSize: 24, color: Colors.pinkAccent)),
          Expanded(
            child: Row(
              children: [
                Expanded(child: Container(margin: const EdgeInsets.all(8), color: Colors.black45, child: const Center(child: Text("Original Image")))),
                Expanded(child: Container(margin: const EdgeInsets.all(8), color: Colors.black45, child: const Center(child: Text("AI Highlighting Boundaries")))),
              ],
            ),
          ),
          Text(_ai, style: const TextStyle(fontSize: 20, color: Colors.red)),
        ],
      ),
    );
  }
}

class RheumatologyDashboard extends StatefulWidget {
  const RheumatologyDashboard({super.key});
  @override
  State<RheumatologyDashboard> createState() => _RheumatologyDashboardState();
}

class _RheumatologyDashboardState extends State<RheumatologyDashboard> {
  String _das28 = "Calculating DAS28...";
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  void _loadData() async {
    final res = await runDas28Licensed();
    setState(() => _das28 = res);
  }
  @override
  Widget build(BuildContext context) {
    if (_das28.contains("PAYWALL")) return buildPaywall(_das28);
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          // Human Body Map Simulation using CustomPaint/Icons
          Expanded(
            child: Column(
              children: [
                const Text("Human Body Map (Joint Selection)", style: TextStyle(fontSize: 20)),
                Expanded(
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      const Icon(Icons.accessibility_new, size: 300, color: Colors.grey),
                      Positioned(top: 150, left: 100, child: Icon(Icons.circle, color: Colors.red.withOpacity(0.8))),
                      Positioned(top: 150, right: 100, child: Icon(Icons.circle, color: Colors.orange.withOpacity(0.8))),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Center(child: Text(_das28, style: const TextStyle(fontSize: 24, color: Colors.orangeAccent))),
          )
        ],
      ),
    );
  }
}
