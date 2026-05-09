import 'package:flutter/material.dart';
import '../src/rust/api.dart';

class CardioDashboard extends StatefulWidget {
  const CardioDashboard({super.key});
  @override
  State<CardioDashboard> createState() => _CardioDashboardState();
}

class _CardioDashboardState extends State<CardioDashboard> {
  String _ecg = "Analyzing ECG stream...";
  @override
  void initState() {
    super.initState();
    _loadEcg();
  }
  void _loadEcg() async {
    final res = await analyzeEcgRhythm(ecgData: [1.2, 1.8, 2.0, 1.1]);
    setState(() => _ecg = res);
  }
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Cardiologist (Sp.JP)", style: TextStyle(fontSize: 24, color: Colors.redAccent)),
          const SizedBox(height: 20),
          Card(
            color: Colors.black45,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Text(_ecg, style: TextStyle(color: _ecg.contains("AFib") ? Colors.orangeAccent : Colors.greenAccent, fontSize: 18)),
            ),
          ),
        ],
      ),
    );
  }
}
