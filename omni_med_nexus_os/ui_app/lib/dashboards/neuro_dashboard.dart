import 'package:flutter/material.dart';
import 'package:flutter_3d_controller/flutter_3d_controller.dart';

class NeuroDashboard extends StatelessWidget {
  const NeuroDashboard({super.key});
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Padding(
          padding: EdgeInsets.all(16.0),
          child: Text("Holographic Surgical Pre-Op (Neural Navigation)", style: TextStyle(fontSize: 20, color: Colors.cyanAccent)),
        ),
        Expanded(
          child: Container(
            margin: const EdgeInsets.all(16),
            decoration: BoxDecoration(border: Border.all(color: Colors.cyanAccent)),
            child: Flutter3DViewer(
              controller: Flutter3DController(),
              src: 'https://modelviewer.dev/shared-assets/models/Brain.glb',
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: ElevatedButton(onPressed: () {}, child: const Text("Sync Navigation to OR-1")),
        )
      ],
    );
  }
}
