import 'package:flutter/material.dart';
import '../src/rust/api.dart';
import 'primary_care_dashboards.dart'; // for buildPaywall

class NephrologyDashboard extends StatelessWidget {
  const NephrologyDashboard({super.key});
  @override
  Widget build(BuildContext context) {
    return const Center(child: Text("Nephrology: Dialysis Tracking & Kt/V", style: TextStyle(fontSize: 20, color: Colors.blueAccent)));
  }
}

class EndocrinologyDashboard extends StatefulWidget {
  const EndocrinologyDashboard({super.key});
  @override
  State<EndocrinologyDashboard> createState() => _EndocrinologyDashboardState();
}

class _EndocrinologyDashboardState extends State<EndocrinologyDashboard> {
  String _cgm = "Syncing CGM...";
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  void _loadData() async {
    final res = await integrateCgmData();
    setState(() => _cgm = res);
  }
  @override
  Widget build(BuildContext context) {
    if (_cgm.contains("PAYWALL")) return buildPaywall(_cgm);
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          const Text("Endocrinology: Continuous Glucose Monitor (CGM)", style: TextStyle(fontSize: 24, color: Colors.tealAccent)),
          const SizedBox(height: 20),
          Expanded(child: Container(color: Colors.black26, child: const Center(child: Icon(Icons.show_chart, size: 100, color: Colors.teal)))),
          const SizedBox(height: 20),
          Text(_cgm, style: const TextStyle(fontSize: 20, color: Colors.orangeAccent)),
        ],
      ),
    );
  }
}

class PulmonologyDashboard extends StatefulWidget {
  const PulmonologyDashboard({super.key});
  @override
  State<PulmonologyDashboard> createState() => _PulmonologyDashboardState();
}

class _PulmonologyDashboardState extends State<PulmonologyDashboard> {
  String _lung = "Analyzing AQI vs Spirometry...";
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  void _loadData() async {
    final res = await predictLungFunction();
    setState(() => _lung = res);
  }
  @override
  Widget build(BuildContext context) {
    if (_lung.contains("PAYWALL")) return buildPaywall(_lung);
    return Center(child: Text(_lung, style: const TextStyle(fontSize: 20, color: Colors.blueAccent)));
  }
}

class GastroenterologyDashboard extends StatefulWidget {
  const GastroenterologyDashboard({super.key});
  @override
  State<GastroenterologyDashboard> createState() => _GastroenterologyDashboardState();
}

class _GastroenterologyDashboardState extends State<GastroenterologyDashboard> {
  String _ai = "Connecting to Endoscopy Video Feed...";
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  void _loadData() async {
    final res = await endoscopicAiVision();
    setState(() => _ai = res);
  }
  @override
  Widget build(BuildContext context) {
    if (_ai.contains("PAYWALL")) return buildPaywall(_ai);
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          const Text("Gastroenterology: Endoscopic AI Vision", style: TextStyle(fontSize: 24, color: Colors.pink)),
          Expanded(child: Container(color: Colors.black, child: const Center(child: Icon(Icons.videocam, size: 100, color: Colors.white24)))),
          Text(_ai, style: const TextStyle(fontSize: 20, color: Colors.redAccent)),
        ],
      ),
    );
  }
}

class PharmacyDashboard extends StatefulWidget {
  const PharmacyDashboard({super.key});
  @override
  State<PharmacyDashboard> createState() => _PharmacyDashboardState();
}

class _PharmacyDashboardState extends State<PharmacyDashboard> {
  String _inventory = "Running Replenishment AI...";
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  void _loadData() async {
    final res = await runSmartInventory();
    setState(() => _inventory = res);
  }
  @override
  Widget build(BuildContext context) {
    if (_inventory.contains("PAYWALL")) return buildPaywall(_inventory);
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          const Text("Pharmacy: Smart Inventory Replenishment", style: TextStyle(fontSize: 24, color: Colors.greenAccent)),
          const SizedBox(height: 20),
          Card(
            color: Colors.blueGrey.shade800,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Text(_inventory, style: const TextStyle(fontSize: 18, color: Colors.orangeAccent)),
            ),
          )
        ],
      ),
    );
  }
}
