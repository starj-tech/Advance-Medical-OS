import 'package:flutter/material.dart';

class ERDashboard extends StatelessWidget {
  const ERDashboard({super.key});
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          color: Colors.red.withOpacity(0.8),
          child: const Text("CRITICAL: 2 Patients in RED ZONE. Wait time 0 mins.", style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
        ),
        const SizedBox(height: 20),
        ListTile(
          tileColor: Colors.black26,
          leading: const Icon(Icons.warning, color: Colors.orange),
          title: const Text("Patient B - YELLOW (Fracture)"),
          subtitle: const Text("Wait time: 15 mins"),
        ),
        const SizedBox(height: 20),
        ElevatedButton.icon(
          onPressed: () {},
          icon: const Icon(Icons.emergency),
          label: const Text("Dispatch Ambulance (Auto-Routing)"),
          style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
        )
      ],
    );
  }
}
