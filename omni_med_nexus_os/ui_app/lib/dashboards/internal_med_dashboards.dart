import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../src/rust/api.dart';
import 'primary_care_dashboards.dart';

class NephrologyDashboard extends StatelessWidget {
  const NephrologyDashboard({super.key});
  @override
  Widget build(BuildContext context) { return const Center(child: Text("Nephrology", style: TextStyle(fontSize: 20))); }
}

class EndocrinologyDashboard extends StatefulWidget {
  const EndocrinologyDashboard({super.key});
  @override
  State<EndocrinologyDashboard> createState() => _EndocrinologyDashboardState();
}

class _EndocrinologyDashboardState extends State<EndocrinologyDashboard> {
  String _cgm = "Syncing CGM...";
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  void _loadData() async {
    final res = await integrateCgmData();
    setState(() => _cgm = res);
  }
  @override
  Widget build(BuildContext context) {
    if (_cgm.contains("PAYWALL")) return buildPaywall(_cgm);

    // Simulate 24h glucose trend
    final spots = [FlSpot(0, 110), FlSpot(4, 90), FlSpot(8, 140), FlSpot(12, 105), FlSpot(16, 85), FlSpot(20, 130), FlSpot(24, 100)];

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Endocrinology: Continuous Glucose Monitor (CGM)", style: TextStyle(fontSize: 24, color: Colors.tealAccent)),
          const SizedBox(height: 20),
          Text(_cgm, style: const TextStyle(fontSize: 20, color: Colors.greenAccent)),
          const SizedBox(height: 20),
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
              child: LineChart(
                LineChartData(
                  minY: 50, maxY: 200,
                  titlesData: const FlTitlesData(show: true),
                  lineBarsData: [
                    LineChartBarData(
                      spots: spots, isCurved: true, color: Colors.purple, barWidth: 4,
                      belowBarData: BarAreaData(show: true, color: Colors.purple.withOpacity(0.2)),
                    )
                  ]
                )
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class PulmonologyDashboard extends StatelessWidget {
  const PulmonologyDashboard({super.key});
  @override
  Widget build(BuildContext context) { return const Center(child: Text("Pulmo", style: TextStyle(fontSize: 20))); }
}

class GastroenterologyDashboard extends StatelessWidget {
  const GastroenterologyDashboard({super.key});
  @override
  Widget build(BuildContext context) { return const Center(child: Text("Gastro", style: TextStyle(fontSize: 20))); }
}

class PharmacyDashboard extends StatefulWidget {
  const PharmacyDashboard({super.key});
  @override
  State<PharmacyDashboard> createState() => _PharmacyDashboardState();
}

class _PharmacyDashboardState extends State<PharmacyDashboard> {
  String _inventory = "Running Replenishment AI...";
  @override
  void initState() {
    super.initState();
    _loadData();
  }
  void _loadData() async {
    final res = await runSmartInventory();
    setState(() => _inventory = res);
  }
  @override
  Widget build(BuildContext context) {
    if (_inventory.contains("PAYWALL")) return buildPaywall(_inventory);
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Pharmacy: Smart Inventory Traffic Light", style: TextStyle(fontSize: 24, color: Colors.greenAccent)),
          const SizedBox(height: 20),
          Card(
            color: Colors.blueGrey.shade800,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Text(_inventory, style: const TextStyle(fontSize: 18, color: Colors.orangeAccent)),
            ),
          ),
          const SizedBox(height: 20),
          Expanded(
            child: ListView(
              children: [
                _buildStock("Paracetamol", 500, Colors.green),
                _buildStock("Amoxicillin", 50, Colors.orange), // Triggered by the AI
                _buildStock("Aspirin", 0, Colors.red),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildStock(String name, int qty, Color color) {
    return ListTile(
      leading: Icon(Icons.circle, color: color),
      title: Text(name, style: const TextStyle(fontSize: 18)),
      trailing: Text("Qty: $qty", style: const TextStyle(fontSize: 18)),
    );
  }
}
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
