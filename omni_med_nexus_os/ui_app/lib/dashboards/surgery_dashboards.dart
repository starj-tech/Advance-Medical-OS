import 'package:flutter/material.dart';

class UrologyDashboard extends StatelessWidget {
  const UrologyDashboard({super.key});
  @override
  Widget build(BuildContext context) {
    return const Center(child: Text("Urology: ESWL & Robotic Control Center", style: TextStyle(fontSize: 20, color: Colors.purpleAccent)));
  }
}

class PlasticSurgeryDashboard extends StatelessWidget {
  const PlasticSurgeryDashboard({super.key});
  @override
  Widget build(BuildContext context) {
    return const Center(child: Text("Plastic Surgery: AR Aesthetic Simulator", style: TextStyle(fontSize: 20, color: Colors.pinkAccent)));
  }
}

class VascularDashboard extends StatelessWidget {
  const VascularDashboard({super.key});
  @override
  Widget build(BuildContext context) {
    return const Center(child: Text("Vascular Surgery: Doppler Flow & Stent Map", style: TextStyle(fontSize: 20, color: Colors.redAccent)));
  }
}
