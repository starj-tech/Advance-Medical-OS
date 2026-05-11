#!/bin/bash
cat << 'INNER_EOF' > omni_med_nexus_os/ui_app/lib/dashboards/ortho_dashboard.dart
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
                    child: InteractiveViewer(
                      minScale: 1.0, maxScale: 10.0,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          const Icon(Icons.accessibility, size: 400, color: Colors.grey), // Mock XRay
                          // Custom Grid Painter for Millimeter scale simulation
                          Positioned.fill(
                            child: CustomPaint(painter: GridPainter()),
                          ),
                          // Implant overlay mock
                          Positioned(
                            top: 150, left: 180,
                            child: Container(
                              width: 30, height: 120,
                              decoration: BoxDecoration(
                                color: Colors.white70,
                                border: Border.all(color: Colors.redAccent, width: 2),
                                borderRadius: BorderRadius.circular(4)
                              )
                            ),
                          ),
                          const Positioned(
                            top: 270, left: 160,
                            child: Text("Titanium Plate 120mm x 30mm", style: TextStyle(color: Colors.redAccent, backgroundColor: Colors.black54, fontSize: 10)),
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

class GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.tealAccent.withOpacity(0.2)
      ..strokeWidth = 0.5;

    // Draw millimeter-style grid
    double gridSpacing = 20.0;
    for (double i = 0; i < size.width; i += gridSpacing) {
      canvas.drawLine(Offset(i, 0), Offset(i, size.height), paint);
    }
    for (double i = 0; i < size.height; i += gridSpacing) {
      canvas.drawLine(Offset(0, i), Offset(size.width, i), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
INNER_EOF
