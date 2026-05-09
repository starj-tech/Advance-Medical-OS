import 'package:flutter/material.dart';
import '../src/rust/api.dart';

class RadioDashboard extends StatefulWidget {
  const RadioDashboard({super.key});
  @override
  State<RadioDashboard> createState() => _RadioDashboardState();
}

class _RadioDashboardState extends State<RadioDashboard> {
  String _ai = "Scanning DICOM...";
  @override
  void initState() {
    super.initState();
    _loadAi();
  }
  void _loadAi() async {
    final res = await detectLesionAi(dicomHash: "image_101");
    setState(() => _ai = res);
  }
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Radiologist Workspace", style: TextStyle(fontSize: 24, color: Colors.tealAccent)),
          const SizedBox(height: 20),
          Container(
            height: 200,
            width: double.infinity,
            color: Colors.black54,
            child: const Center(child: Icon(Icons.image, size: 100, color: Colors.white24)),
          ),
          const SizedBox(height: 20),
          Card(
            color: Colors.blueGrey.shade800,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Text(_ai, style: const TextStyle(color: Colors.orangeAccent, fontSize: 18, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}
