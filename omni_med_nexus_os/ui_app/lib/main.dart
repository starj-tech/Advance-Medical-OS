import 'package:flutter/material.dart';
import 'package:ui_app/src/rust/frb_generated.dart';
import 'package:ui_app/src/rust/api.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_3d_controller/flutter_3d_controller.dart';

Future<void> main() async {
  await RustLib.init();
  runApp(const OmniMedNexusOS());
}

class OmniMedNexusOS extends StatelessWidget {
  const OmniMedNexusOS({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Omni-Med Nexus OS',
      theme: ThemeData(
        primarySwatch: Colors.teal,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F172A), // Deep futuristic blue
      ),
      home: const DashboardNavigator(),
    );
  }
}

class DashboardNavigator extends StatefulWidget {
  const DashboardNavigator({super.key});
  @override
  State<DashboardNavigator> createState() => _DashboardNavigatorState();
}

class _DashboardNavigatorState extends State<DashboardNavigator> {
  int _currentIndex = 0;
  final List<Widget> _dashboards = [
    const NeuralCockpit(),
    const CommandCenter(),
    const GalacticHub(),
  ];

  @override
  Widget build(BuildContext context) {
    // Responsive wrapping for App Bar
    final isMobile = MediaQuery.of(context).size.width < 800;

    return Scaffold(
      appBar: AppBar(
        title: Text(isMobile ? 'Omni-Med OS' : 'Omni-Med Nexus OS - App of Everything', style: const TextStyle(fontSize: 16)),
        backgroundColor: const Color(0xFF1E293B),
        actions: [
          Container(
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: FutureBuilder<String>(
              future: checkSatusehatStatus(),
              builder: (context, snapshot) {
                final status = snapshot.data ?? "Connecting...";
                return Row(
                  children: [
                    const Icon(Icons.bolt, color: Colors.yellowAccent, size: 16),
                    const SizedBox(width: 4),
                    if (!isMobile) const Text("Latency: 0.1ms (Native)", style: TextStyle(color: Colors.greenAccent, fontSize: 12)),
                    if (!isMobile) const SizedBox(width: 16),
                    const Icon(Icons.shield, color: Colors.lightBlue, size: 16),
                    const SizedBox(width: 4),
                    Text(isMobile ? "AES-GCM Sync" : "Zero-Knowledge Sync: $status", style: const TextStyle(color: Colors.lightBlueAccent, fontSize: 12)),
                  ],
                );
              },
            ),
          )
        ],
      ),
      body: _dashboards[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        backgroundColor: const Color(0xFF1E293B),
        selectedItemColor: Colors.tealAccent,
        unselectedItemColor: Colors.grey,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.radar), label: 'Neural Cockpit (Doc)'),
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_customize), label: 'Command Center (Exec)'),
          BottomNavigationBarItem(icon: Icon(Icons.language), label: 'Galactic Hub (Group)'),
        ],
      ),
    );
  }
}

// 1. The Physician’s Neural Cockpit
class NeuralCockpit extends StatefulWidget {
  const NeuralCockpit({super.key});
  @override
  State<NeuralCockpit> createState() => _NeuralCockpitState();
}

class _NeuralCockpitState extends State<NeuralCockpit> {
  String _pharmacogenomicsAlert = "Checking DNA Vitals...";
  String _timeline = "Loading...";

  @override
  void initState() {
    super.initState();
    _loadVitals();
  }

  void _loadVitals() async {
    final alert = await checkPharmacogenomics(drug: "Steroid");
    final timeline = await getBioTimeline();
    setState(() {
      _pharmacogenomicsAlert = alert;
      _timeline = timeline;
    });
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        bool isMobile = constraints.maxWidth < 800;

        List<Widget> content = [
          // Left/Top Panel
          Expanded(
            flex: isMobile ? 0 : 1,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Pharmacogenomics Guard", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.tealAccent)),
                Container(
                  margin: const EdgeInsets.symmetric(vertical: 10),
                  padding: const EdgeInsets.all(12),
                  color: _pharmacogenomicsAlert.contains("ALERT") ? Colors.red.withOpacity(0.3) : Colors.green.withOpacity(0.3),
                  child: Text(_pharmacogenomicsAlert, style: const TextStyle(color: Colors.white)),
                ),
                const SizedBox(height: 10),
                const Text("Longitudinal Bio-Timeline", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.tealAccent)),
                Container(
                  margin: const EdgeInsets.symmetric(vertical: 10),
                  padding: const EdgeInsets.all(12),
                  color: Colors.black45,
                  child: Text(_timeline, style: const TextStyle(color: Colors.white70)),
                ),
                const SizedBox(height: 10),
                const Text("Peer-to-Peer Secure Consult", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.tealAccent)),
                ElevatedButton.icon(
                  onPressed: () async {
                    await peerToPeerConsult(docId: "Dr. House", payload: "Patient X Data");
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("E2EE Consult Sent!")));
                  },
                  icon: const Icon(Icons.lock),
                  label: const Text("Share Patient E2EE"),
                ),
              ],
            ),
          ),
          if (!isMobile) const SizedBox(width: 20),
          // Right/Bottom Panel
          Expanded(
            flex: isMobile ? 0 : 1,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Holographic Surgical Pre-Op", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.tealAccent)),
                Container(
                  height: 300,
                  margin: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(border: Border.all(color: Colors.tealAccent)),
                  child: Flutter3DViewer(
                    controller: Flutter3DController(),
                    src: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
                  ),
                ),
              ],
            ),
          ),
        ];

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: isMobile
            ? Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: content)
            : Row(crossAxisAlignment: CrossAxisAlignment.start, children: content),
        );
      }
    );
  }
}

// 2. The Hospital Command Center
class CommandCenter extends StatefulWidget {
  const CommandCenter({super.key});
  @override
  State<CommandCenter> createState() => _CommandCenterState();
}

class _CommandCenterState extends State<CommandCenter> {
  String _labor = "";
  String _legal = "";
  String _maintenance = "";

  @override
  void initState() {
    super.initState();
    _loadCommandData();
  }

  void _loadCommandData() async {
    final labor = await laborArbitrageOptimizer();
    final legal = await legalRiskHeatmap();
    final maint = await preventiveMaintenanceCheck();
    setState(() {
      _labor = labor;
      _legal = legal;
      _maintenance = maint;
    });
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildCard("Labor Arbitrage & Shift Optimizer", _labor, Icons.people, Colors.blueAccent),
        _buildCard("Legal Risk Heatmap", _legal, Icons.gavel, Colors.orangeAccent),
        _buildCard("Preventive Maintenance Ledger", _maintenance, Icons.build, Colors.purpleAccent),
      ],
    );
  }

  Widget _buildCard(String title, String data, IconData icon, Color color) {
    return Card(
      color: const Color(0xFF1E293B),
      margin: const EdgeInsets.only(bottom: 16),
      child: ListTile(
        leading: Icon(icon, color: color, size: 40),
        title: Text(title, style: TextStyle(color: color, fontWeight: FontWeight.bold)),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 8.0),
          child: Text(data, style: const TextStyle(color: Colors.white70)),
        ),
      ),
    );
  }
}

// 3. The Galactic Governance Hub
class GalacticHub extends StatefulWidget {
  const GalacticHub({super.key});
  @override
  State<GalacticHub> createState() => _GalacticHubState();
}

class _GalacticHubState extends State<GalacticHub> {
  String _ma = "";
  String _sentiment = "";

  @override
  void initState() {
    super.initState();
    _loadGalacticData();
  }

  void _loadGalacticData() async {
    final ma = await runMADueDiligence();
    final sentiment = await getBrandSentiment();
    setState(() {
      _ma = ma;
      _sentiment = sentiment;
    });
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildCard("M&A Due Diligence Engine", _ma, Icons.business, Colors.cyanAccent),
        _buildCard("Brand Sentiment Neural Net", _sentiment, Icons.sentiment_neutral, Colors.pinkAccent),
      ],
    );
  }

  Widget _buildCard(String title, String data, IconData icon, Color color) {
    return Card(
      color: const Color(0xFF1E293B),
      margin: const EdgeInsets.only(bottom: 16),
      child: ListTile(
        leading: Icon(icon, color: color, size: 40),
        title: Text(title, style: TextStyle(color: color, fontWeight: FontWeight.bold)),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 8.0),
          child: Text(data, style: const TextStyle(color: Colors.white70)),
        ),
      ),
    );
  }
}
