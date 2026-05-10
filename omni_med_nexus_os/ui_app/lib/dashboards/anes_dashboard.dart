import 'package:flutter/material.dart';

class AnesthesiologyDashboard extends StatelessWidget {
  const AnesthesiologyDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black, // High contrast OR environment
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            const Row(
              children: [
                Icon(Icons.monitor_heart, color: Colors.greenAccent, size: 30),
                SizedBox(width: 10),
                Text("Anesthesiology: Dynamic Sedation Monitor", style: TextStyle(color: Colors.greenAccent, fontSize: 24, fontWeight: FontWeight.bold)),
                Spacer(),
                Text("OR-1 | Patient: ACTIVE", style: TextStyle(color: Colors.white70)),
              ],
            ),
            const SizedBox(height: 20),
            Expanded(
              child: Row(
                children: [
                  Expanded(child: _buildVitalBox("Heart Rate", "78", "bpm", Colors.green)),
                  const SizedBox(width: 16),
                  Expanded(child: _buildVitalBox("SpO2", "99", "%", Colors.lightBlueAccent)),
                  const SizedBox(width: 16),
                  Expanded(child: _buildVitalBox("Blood Pressure", "110/70", "mmHg", Colors.orangeAccent)),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(color: Colors.blueGrey.shade900, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.purpleAccent, width: 2)),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("Metabolic Clearance AI", style: TextStyle(color: Colors.purpleAccent, fontSize: 18)),
                      SizedBox(height: 5),
                      Text("Propofol Infusion: 4 mg/kg/hr", style: TextStyle(color: Colors.white)),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text("Predicted Awakening Time", style: TextStyle(color: Colors.white54, fontSize: 16)),
                      Text("14 Min 30 Sec", style: TextStyle(color: Colors.yellowAccent, fontSize: 32, fontWeight: FontWeight.bold)),
                    ],
                  )
                ],
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildVitalBox(String title, String val, String unit, Color color) {
    return Container(
      decoration: BoxDecoration(border: Border.all(color: color.withOpacity(0.5), width: 2), borderRadius: BorderRadius.circular(16)),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(title, style: TextStyle(color: color, fontSize: 20)),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(val, style: TextStyle(color: color, fontSize: 80, fontWeight: FontWeight.bold)),
              const SizedBox(width: 5),
              Text(unit, style: TextStyle(color: color, fontSize: 20)),
            ],
          )
        ],
      ),
    );
  }
}
