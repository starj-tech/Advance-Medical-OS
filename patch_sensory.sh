#!/bin/bash
cat << 'INNER_EOF' >> omni_med_nexus_os/ui_app/lib/dashboards/sensory_dashboards.dart
class EnhancedOphthalmologyDashboard extends StatefulWidget {
  const EnhancedOphthalmologyDashboard({super.key});
  @override
  State<EnhancedOphthalmologyDashboard> createState() => _EnhancedOphthalmologyDashboardState();
}

class _EnhancedOphthalmologyDashboardState extends State<EnhancedOphthalmologyDashboard> {
  String _oct = "Analyzing OCT...";
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  void _loadData() async {
    final res = await detectRetinopathyLicensed(octImageHash: "diab_scan_01");
    setState(() => _oct = res);
  }
  @override
  Widget build(BuildContext context) {
    if (_oct.contains("PAYWALL")) return buildPaywall(_oct);
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          const Text("Ophthalmology: Retinal Scan AI Overlay", style: TextStyle(fontSize: 24, color: Colors.yellowAccent)),
          const SizedBox(height: 20),
          Expanded(
            child: Stack(
              alignment: Alignment.center,
              children: [
                Container(width: 400, height: 400, decoration: const BoxDecoration(color: Colors.black, shape: BoxShape.circle)),
                const Icon(Icons.remove_red_eye, size: 300, color: Colors.white24),
                // AI Heatmap Overlay
                Positioned(top: 150, right: 120, child: Container(width: 50, height: 50, decoration: BoxDecoration(color: Colors.red.withOpacity(0.5), shape: BoxShape.circle))),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Text(_oct, style: const TextStyle(fontSize: 20, color: Colors.orange)),
        ],
      ),
    );
  }
}
INNER_EOF

sed -i 's/case UserRole.SpM: content = const OphthalmologyDashboard(); break;/case UserRole.SpM: content = const EnhancedOphthalmologyDashboard(); break;/' omni_med_nexus_os/ui_app/lib/dashboards/router.dart
