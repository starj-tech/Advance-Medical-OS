#!/bin/bash
cat << 'INNER_EOF' >> omni_med_nexus_os/ui_app/lib/dashboards/internal_med_dashboards.dart
// Enhanced Pulmonology with Mock Graph
class EnhancedPulmonologyDashboard extends StatefulWidget {
  const EnhancedPulmonologyDashboard({super.key});
  @override
  State<EnhancedPulmonologyDashboard> createState() => _EnhancedPulmonologyDashboardState();
}

class _EnhancedPulmonologyDashboardState extends State<EnhancedPulmonologyDashboard> {
  String _lung = "Analyzing AQI vs Spirometry...";
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  void _loadData() async {
    final res = await predictLungFunction();
    setState(() => _lung = res);
  }
  @override
  Widget build(BuildContext context) {
    if (_lung.contains("PAYWALL")) return buildPaywall(_lung);
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Pulmonology: AQI vs FEV1 Spirometry", style: TextStyle(fontSize: 24, color: Colors.blueAccent)),
          const SizedBox(height: 20),
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
              child: LineChart(
                LineChartData(
                  minY: 0, maxY: 100,
                  titlesData: const FlTitlesData(show: true),
                  lineBarsData: [
                    LineChartBarData(
                      spots: const [FlSpot(1, 80), FlSpot(2, 85), FlSpot(3, 60), FlSpot(4, 75)],
                      color: Colors.blue, barWidth: 4, isCurved: true,
                    ), // FEV1
                    LineChartBarData(
                      spots: const [FlSpot(1, 20), FlSpot(2, 15), FlSpot(3, 150), FlSpot(4, 40)],
                      color: Colors.red, barWidth: 2, isCurved: true, dotData: const FlDotData(show: false)
                    ), // AQI
                  ]
                )
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text(_lung, style: const TextStyle(fontSize: 20, color: Colors.redAccent)),
        ],
      ),
    );
  }
}
INNER_EOF

sed -i 's/case UserRole.Pulmonologist: content = const PulmonologyDashboard(); break;/case UserRole.Pulmonologist: content = const EnhancedPulmonologyDashboard(); break;/' omni_med_nexus_os/ui_app/lib/dashboards/router.dart
