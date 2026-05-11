import 'package:flutter/material.dart';
import '../design/glassmorphism.dart';
import '../src/rust/api.dart';
import 'package:flutter_3d_controller/flutter_3d_controller.dart';

class ExecDashboard extends StatefulWidget {
  const ExecDashboard({super.key});
  @override
  State<ExecDashboard> createState() => _ExecDashboardState();
}

class _ExecDashboardState extends State<ExecDashboard> {
  String _migrationStatus = "Loading migration status...";
  List<String> _hardware = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() async {
    initializeHardwareGateways();
    final migration = await getShadowMigrationStatus();
    final hw = await getAllHardwareSummary();
    setState(() {
      _migrationStatus = migration;
      _hardware = hw;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Command Center", style: TextStyle(fontSize: 28, color: Colors.white, fontWeight: FontWeight.w300)),
        const SizedBox(height: 20),
        Expanded(
          child: Row(
            children: [
              Expanded(
                flex: 2,
                child: GlassPanel(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("NexusConnect Infrastructure", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 20),
                      Text(_migrationStatus, style: const TextStyle(color: Colors.greenAccent, fontSize: 16)),
                      const Divider(color: Colors.white24, height: 40),
                      const Text("Active Fleet Connectivity", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 10),
                      ..._hardware.map((h) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4.0),
                        child: Text(h, style: const TextStyle(color: Colors.cyanAccent, fontFamily: 'monospace', fontSize: 14)),
                      )).toList(),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 20),
              Expanded(
                flex: 1,
                child: GlassPanel(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("Live 3D Asset Map", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                      Expanded(
                        child: Flutter3DViewer(
                          controller: Flutter3DController(),
                          src: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb', // Simulating Hospital Map
                        ),
                      )
                    ],
                  ),
                ),
              )
            ],
          ),
        ),
      ],
    );
  }
}
