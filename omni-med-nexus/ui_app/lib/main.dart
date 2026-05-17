import 'package:flutter/material.dart';
import 'theme/pulse_theme.dart';

void main() {
  runApp(const OmniMedNexusOS());
}

class OmniMedNexusOS extends StatelessWidget {
  const OmniMedNexusOS({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Omni-Med Nexus OS',
      theme: PulseDesignSystem.themeData,
      home: const DashboardScreen(),
    );
  }
}

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Omni-Med Nexus OS', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.favorite, color: PulseDesignSystem.greenOrganic),
            onPressed: () {},
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: PulseDesignSystem.cyanLight.withOpacity(0.2),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: PulseDesignSystem.cyanLight, width: 2),
              ),
              child: const Text(
                'Intelligent Pulse of Healthcare',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w500, color: PulseDesignSystem.bluePrimary),
              ),
            ),
            const SizedBox(height: 40),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _buildColorBox(PulseDesignSystem.bluePrimary, 'Primary'),
                const SizedBox(width: 16),
                _buildColorBox(PulseDesignSystem.cyanLight, 'Secondary'),
                const SizedBox(width: 16),
                _buildColorBox(PulseDesignSystem.boneWhite, 'Background', textColor: PulseDesignSystem.darkNavy, border: true),
                const SizedBox(width: 16),
                _buildColorBox(PulseDesignSystem.darkNavy, 'Dark Text'),
                const SizedBox(width: 16),
                _buildColorBox(PulseDesignSystem.greenOrganic, 'Organic Accent'),
              ],
            ),
            const SizedBox(height: 40),
            ElevatedButton(
              onPressed: () {},
              child: const Text('Connect to Core Engine (Rust)'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildColorBox(Color color, String label, {Color textColor = Colors.white, bool border = false}) {
    return Column(
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(8),
            border: border ? Border.all(color: Colors.grey.shade300) : null,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 8,
                offset: const Offset(0, 4),
              )
            ],
          ),
        ),
        const SizedBox(height: 8),
        Text(label, style: const TextStyle(fontSize: 12)),
      ],
    );
  }
}
