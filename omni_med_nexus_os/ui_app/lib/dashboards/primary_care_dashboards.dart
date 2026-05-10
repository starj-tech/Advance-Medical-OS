import 'package:flutter/material.dart';
import '../src/rust/api.dart';

// Helper for Paywall
Widget buildPaywall(String message) {
  return Center(
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.lock, size: 80, color: Colors.grey),
        const SizedBox(height: 20),
        Text(message, style: const TextStyle(fontSize: 18, color: Colors.orangeAccent), textAlign: TextAlign.center),
        const SizedBox(height: 20),
        ElevatedButton(onPressed: () {}, style: ElevatedButton.styleFrom(backgroundColor: Colors.teal), child: const Text("Unlock via Stripe")),
      ],
    ),
  );
}

class GPDashboard extends StatelessWidget {
  const GPDashboard({super.key});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("GP: High-Velocity Triage & Referral", style: TextStyle(fontSize: 24, color: Colors.blueAccent)),
          const SizedBox(height: 20),
          Expanded(
            child: GridView.count(
              crossAxisCount: 2,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              children: [
                Container(color: Colors.green.withOpacity(0.2), child: const Center(child: Text("Quick Anamnesis", style: TextStyle(fontSize: 18)))),
                Container(color: Colors.blue.withOpacity(0.2), child: const Center(child: Text("Auto-Referral to Sp.PD", style: TextStyle(fontSize: 18)))),
              ],
            ),
          )
        ],
      ),
    );
  }
}

class InternistDashboard extends StatefulWidget {
  const InternistDashboard({super.key});
  @override
  State<InternistDashboard> createState() => _InternistDashboardState();
}

class _InternistDashboardState extends State<InternistDashboard> {
  String _polyStatus = "Checking Polypharmacy...";
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  void _loadData() async {
    final res = await checkPolypharmacyLock();
    setState(() => _polyStatus = res);
  }
  @override
  Widget build(BuildContext context) {
    if (_polyStatus.contains("PAYWALL")) return buildPaywall(_polyStatus);
    return Center(child: Text(_polyStatus, style: const TextStyle(fontSize: 20, color: Colors.greenAccent)));
  }
}

class PsychiatristDashboard extends StatefulWidget {
  const PsychiatristDashboard({super.key});
  @override
  State<PsychiatristDashboard> createState() => _PsychiatristDashboardState();
}

class _PsychiatristDashboardState extends State<PsychiatristDashboard> {
  String _mood = "Analyzing Mood Trends...";
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  void _loadData() async {
    final res = await analyzeMoodTrend();
    setState(() => _mood = res);
  }
  @override
  Widget build(BuildContext context) {
    if (_mood.contains("PAYWALL")) return buildPaywall(_mood);
    return Center(child: Text(_mood, style: const TextStyle(fontSize: 20, color: Colors.purpleAccent)));
  }
}

class PediatricsDashboard extends StatelessWidget {
  const PediatricsDashboard({super.key});
  @override
  Widget build(BuildContext context) {
    // Child-friendly UI implementation
    return Scaffold(
      backgroundColor: Colors.lightBlue.shade50, // Soft aesthetic
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            const Text("Pediatric Growth Chart (WHO)", style: TextStyle(fontSize: 24, color: Colors.blueAccent, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            Expanded(
              child: Container(
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                child: const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.child_care, size: 80, color: Colors.orangeAccent),
                      SizedBox(height: 20),
                      Text("Height: 95th Percentile | Weight: 80th Percentile", style: TextStyle(color: Colors.black87, fontSize: 18)),
                    ],
                  ),
                ),
              ),
            )
          ],
        ),
      ),
    );
  }
}
