import 'package:flutter/material.dart';

class OrthopedicDashboard extends StatelessWidget {
  const OrthopedicDashboard({super.key});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Orthopedic Pre-Op Implant Templating", style: TextStyle(fontSize: 24, color: Colors.blueAccent)),
          const SizedBox(height: 20),
          Expanded(
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: Container(
                    decoration: BoxDecoration(border: Border.all(color: Colors.white24)),
                    // Using InteractiveViewer to simulate pan/zoom on X-Ray
                    child: InteractiveViewer(
                      minScale: 1.0, maxScale: 5.0,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          const Icon(Icons.accessibility, size: 400, color: Colors.grey), // Mock XRay
                          // Mock overlaying a titanium plate
                          Positioned(
                            top: 200, left: 150,
                            child: Container(width: 20, height: 100, decoration: BoxDecoration(color: Colors.white70, border: Border.all(color: Colors.redAccent, width: 2))),
                          ),
                          const Positioned(
                            top: 200, left: 175,
                            child: Text("Titanium Plate 100mm", style: TextStyle(color: Colors.redAccent, backgroundColor: Colors.black54)),
                          )
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 20),
                Expanded(
                  flex: 1,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("Implant Inventory", style: TextStyle(fontSize: 18, color: Colors.white)),
                      ListTile(title: const Text("Plate 80mm"), trailing: const Text("In Stock", style: TextStyle(color: Colors.green)), onTap: (){}),
                      ListTile(title: const Text("Plate 100mm"), trailing: const Text("Selected", style: TextStyle(color: Colors.orange)), onTap: (){}),
                      ListTile(title: const Text("Screw 15mm"), trailing: const Text("In Stock", style: TextStyle(color: Colors.green)), onTap: (){}),
                    ],
                  ),
                )
              ],
            ),
          )
        ],
      ),
    );
  }
}
