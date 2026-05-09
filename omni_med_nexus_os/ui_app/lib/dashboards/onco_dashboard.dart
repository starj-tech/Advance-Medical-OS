import 'package:flutter/material.dart';
import '../src/rust/api.dart';

class OncoDashboard extends StatefulWidget {
  const OncoDashboard({super.key});
  @override
  State<OncoDashboard> createState() => _OncoDashboardState();
}

class _OncoDashboardState extends State<OncoDashboard> {
  String _dose = "Loading Chemotherapy Protocol...";
  @override
  void initState() {
    super.initState();
    _loadDose();
  }
  void _loadDose() async {
    final res = await calculateChemoDosage(heightCm: 170.0, weightKg: 65.0, egfr: 25.0);
    setState(() => _dose = res);
  }
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Oncologist (Sp.Onk) - Chemo Planner", style: TextStyle(fontSize: 24, color: Colors.purpleAccent)),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(20),
            color: Colors.blueGrey.shade800,
            child: Text(_dose, style: const TextStyle(color: Colors.white, fontSize: 18)),
          ),
          const Padding(
            padding: EdgeInsets.only(top: 8.0),
            child: Text("*Note: Dosage is automatically renal-adjusted based on eGFR.", style: TextStyle(color: Colors.orange)),
          )
        ],
      ),
    );
  }
}
