#!/bin/bash
cat << 'INNER_EOF' > omni_med_nexus_os/ui_app/lib/dashboards/er_dashboard.dart
import 'package:flutter/material.dart';

class ERDashboard extends StatelessWidget {
  const ERDashboard({super.key});
  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Main Action Area
        Expanded(
          flex: 2,
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: Colors.red.withOpacity(0.8), borderRadius: BorderRadius.circular(16)),
                child: const Row(
                  children: [
                    Icon(Icons.warning_amber_rounded, color: Colors.white, size: 40),
                    SizedBox(width: 16),
                    Expanded(child: Text("CRITICAL: 2 Patients in RED ZONE. Wait time 0 mins.", style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold))),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.emergency),
                label: const Padding(padding: EdgeInsets.all(16.0), child: Text("Dispatch Ambulance (Auto-Routing)", style: TextStyle(fontSize: 18))),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
              )
            ],
          ),
        ),
        const SizedBox(width: 20),
        // Patient Queue Sidebar
        Expanded(
          flex: 1,
          child: Container(
            decoration: BoxDecoration(color: Colors.black.withOpacity(0.2), borderRadius: BorderRadius.circular(16)),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text("Triage Queue", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                _buildQueueItem("Patient B", "YELLOW (Fracture)", "15 mins", Colors.orange),
                _buildQueueItem("Patient C", "GREEN (Fever)", "45 mins", Colors.green),
              ],
            ),
          ),
        )
      ],
    );
  }

  Widget _buildQueueItem(String name, String status, String time, Color color) {
    return Card(
      color: Colors.black45,
      shape: RoundedRectangleBorder(side: BorderSide(color: color, width: 2), borderRadius: BorderRadius.circular(8)),
      child: ListTile(
        leading: Icon(Icons.person, color: color),
        title: Text(name, style: const TextStyle(color: Colors.white)),
        subtitle: Text(status, style: TextStyle(color: color.withOpacity(0.8))),
        trailing: Text(time, style: const TextStyle(color: Colors.white70)),
      ),
    );
  }
}
INNER_EOF
