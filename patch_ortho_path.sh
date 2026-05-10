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
INNER_EOF

# Update Diagnostics Dashboard with Interactive Pathology
cat << 'INNER_EOF' > omni_med_nexus_os/ui_app/lib/dashboards/diagnostics_dashboards.dart
import 'package:flutter/material.dart';
import '../src/rust/api.dart';

class PathologyDashboard extends StatefulWidget {
  const PathologyDashboard({super.key});
  @override
  State<PathologyDashboard> createState() => _PathologyDashboardState();
}

class _PathologyDashboardState extends State<PathologyDashboard> {
  String _ai = "Scanning Slide...";
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  void _loadData() async {
    final res = await countMitosisLicensed();
    setState(() => _ai = res);
  }
  @override
  Widget build(BuildContext context) {
    if (_ai.contains("PAYWALL")) return Center(child: Text(_ai, style: const TextStyle(color: Colors.orangeAccent)));

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Digital Cell Counter (Interactive Microscope)", style: TextStyle(fontSize: 24, color: Colors.purpleAccent)),
          const SizedBox(height: 20),
          Expanded(
            child: InteractiveViewer(
              minScale: 1.0, maxScale: 10.0,
              child: Container(
                decoration: BoxDecoration(color: Colors.black, border: Border.all(color: Colors.purpleAccent)),
                child: Stack(
                  children: [
                    // Mock tissue cells
                    ...List.generate(50, (index) => Positioned(
                      left: (index * 45.0) % 500, top: (index * 30.0) % 400,
                      child: Icon(Icons.circle, size: 20, color: Colors.pink.withOpacity(0.5)),
                    )),
                    // Mock AI Highlights for Mitosis
                    Positioned(left: 100, top: 100, child: Container(width: 30, height: 30, decoration: BoxDecoration(border: Border.all(color: Colors.yellowAccent, width: 2)))),
                    Positioned(left: 200, top: 250, child: Container(width: 30, height: 30, decoration: BoxDecoration(border: Border.all(color: Colors.yellowAccent, width: 2)))),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text(_ai, style: const TextStyle(fontSize: 20, color: Colors.orangeAccent)),
        ],
      ),
    );
  }
}

class ForensicsDashboard extends StatefulWidget {
  const ForensicsDashboard({super.key});
  @override
  State<ForensicsDashboard> createState() => _ForensicsDashboardState();
}

class _ForensicsDashboardState extends State<ForensicsDashboard> {
  String _visum = "Generating Visum...";
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  void _loadData() async {
    final res = await generateVisum(patientId: "PID_404", injury: "Blunt force trauma to the cranium");
    setState(() => _visum = res);
  }
  @override
  Widget build(BuildContext context) {
    return Center(child: Text(_visum, style: const TextStyle(fontSize: 16, fontFamily: 'monospace', color: Colors.greenAccent)));
  }
}
INNER_EOF

# Link Ortho
sed -i 's/import '"'"'radio_dashboard.dart'"'"';/import '"'"'radio_dashboard.dart'"'"';\nimport '"'"'ortho_dashboard.dart'"'"';/' omni_med_nexus_os/ui_app/lib/dashboards/router.dart
sed -i 's/case UserRole.SpOT: content = const Center(child: Text("Orthopedic Pre-Op Templating Placeholder")); break;/case UserRole.SpOT: content = const OrthopedicDashboard(); break;/' omni_med_nexus_os/ui_app/lib/dashboards/router.dart
