import 'package:flutter/material.dart';
import '../src/rust/api.dart';

class ObgynDashboard extends StatefulWidget {
  const ObgynDashboard({super.key});
  @override
  State<ObgynDashboard> createState() => _ObgynDashboardState();
}

class _ObgynDashboardState extends State<ObgynDashboard> {
  String _growth = "Checking fetal trajectory...";
  @override
  void initState() {
    super.initState();
    _loadGrowth();
  }
  void _loadGrowth() async {
    final res = await analyzeFetalGrowth(week: 20, estWeightGrams: 210.0);
    setState(() => _growth = res);
  }
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Obstetrician (Sp.OG) - Fetal Growth Tracker", style: TextStyle(fontSize: 24, color: Colors.pinkAccent)),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(20),
            color: _growth.contains("WARNING") ? Colors.orange.withOpacity(0.3) : Colors.green.withOpacity(0.3),
            child: Text(_growth, style: TextStyle(color: _growth.contains("WARNING") ? Colors.orangeAccent : Colors.greenAccent, fontSize: 18)),
          ),
        ],
      ),
    );
  }
}
