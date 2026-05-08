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
      theme: ThemeData(primarySwatch: Colors.teal, brightness: Brightness.dark),
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
    const DoctorDashboard(),
    const ExecutiveDashboard(),
    const StrategicDashboard(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Omni-Med Nexus OS - The Intelligent Pulse of Healthcare')),
      body: _dashboards[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.local_hospital), label: 'Clinical (Doctor)'),
          BottomNavigationBarItem(icon: Icon(Icons.business_center), label: 'Operational (Exec)'),
          BottomNavigationBarItem(icon: Icon(Icons.account_balance), label: 'Strategic (Group)'),
        ],
      ),
    );
  }
}

// 1. Doctor (Clinical Intelligence)
class DoctorDashboard extends StatefulWidget {
  const DoctorDashboard({super.key});
  @override
  State<DoctorDashboard> createState() => _DoctorDashboardState();
}

class _DoctorDashboardState extends State<DoctorDashboard> {
  String _sttResult = "Press the mic to start The Ghost Scribe.";
  String _prescriptionResult = "";

  void _runScribe() async {
    final result = await ghostScribeMockProcess(audioPath: "/virtual/audio/rec_01.wav");
    setState(() { _sttResult = result; });
  }

  void _runPrescription() async {
    final result = await oneTapPrescription(drug: "Amoxicillin");
    setState(() { _prescriptionResult = result; });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("The Ghost Scribe", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                ElevatedButton.icon(
                  onPressed: _runScribe,
                  icon: const Icon(Icons.mic),
                  label: const Text("Start Recording"),
                ),
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(12),
                  color: Colors.black26,
                  child: Text(_sttResult),
                ),
                const SizedBox(height: 20),
                const Text("One-Tap Prescription", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                ElevatedButton(onPressed: _runPrescription, child: const Text("Prescribe Amoxicillin")),
                const SizedBox(height: 10),
                Text(_prescriptionResult, style: const TextStyle(color: Colors.orange)),
              ],
            ),
          ),
          Expanded(
            child: Column(
              children: [
                const Text("Diagnostic Overlay (BP Trend)", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 20),
                Expanded(
                  child: FutureBuilder<Float64List>(
                    future: getDiagnosticOverlay(),
                    builder: (context, snapshot) {
                      if (!snapshot.hasData) return const CircularProgressIndicator();
                      final spots = snapshot.data!.asMap().entries.map((e) => FlSpot(e.key.toDouble(), e.value)).toList();
                      return LineChart(
                        LineChartData(
                          lineBarsData: [LineChartBarData(spots: spots, isCurved: true, color: Colors.tealAccent, barWidth: 4)],
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          )
        ],
      ),
    );
  }
}

// 2. Executive (Operational Mastery)
class ExecutiveDashboard extends StatefulWidget {
  const ExecutiveDashboard({super.key});
  @override
  State<ExecutiveDashboard> createState() => _ExecutiveDashboardState();
}

class _ExecutiveDashboardState extends State<ExecutiveDashboard> {
  String _revenueGuardAlert = "Running audit...";
  double _extraNurses = 0;
  String _simResult = "";
  Flutter3DController controller = Flutter3DController();

  @override
  void initState() {
    super.initState();
    _runAudit();
    _runSim();
  }

  void _runAudit() async {
    final res = await checkRevenueGuard();
    setState(() => _revenueGuardAlert = res);
  }

  void _runSim() async {
    final res = await digitalTwinSimulation(extraNurses: _extraNurses.toInt());
    setState(() => _simResult = res);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Revenue Guard AI", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                Container(
                  padding: const EdgeInsets.all(12),
                  color: Colors.red.withOpacity(0.2),
                  child: Text(_revenueGuardAlert, style: const TextStyle(color: Colors.redAccent)),
                ),
                const SizedBox(height: 20),
                const Text("Digital Twin Simulation", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                Text("Add Nurses: ${_extraNurses.toInt()}"),
                Slider(
                  value: _extraNurses,
                  min: 0,
                  max: 10,
                  divisions: 10,
                  onChanged: (val) {
                    setState(() => _extraNurses = val);
                    _runSim();
                  },
                ),
                Text(_simResult, style: const TextStyle(color: Colors.greenAccent)),
              ],
            ),
          ),
          Expanded(
            child: Column(
              children: [
                const Text("Live Bed & Asset Mapping (3D)", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                Expanded(
                  // We load a simple cube or 3D object to simulate the map in this bootstrap
                  child: Flutter3DViewer(
                    controller: controller,
                    src: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
                  ),
                ),
              ],
            ),
          )
        ],
      ),
    );
  }
}

// 3. Group (Strategic Governance)
class StrategicDashboard extends StatefulWidget {
  const StrategicDashboard({super.key});
  @override
  State<StrategicDashboard> createState() => _StrategicDashboardState();
}

class _StrategicDashboardState extends State<StrategicDashboard> {
  String _meshResult = "";
  String _benchResult = "";

  @override
  void initState() {
    super.initState();
    _loadStrategicData();
  }

  void _loadStrategicData() async {
    final m = await globalResourceMesh();
    final b = await runBenchmarking();
    setState(() {
      _meshResult = m;
      _benchResult = b;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Global Resource Mesh", style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          Card(
            color: Colors.blueGrey.shade800,
            child: Padding(padding: const EdgeInsets.all(16.0), child: Text(_meshResult, style: const TextStyle(fontSize: 16))),
          ),
          const SizedBox(height: 30),
          const Text("Standardized Benchmarking", style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          Card(
            color: Colors.blueGrey.shade800,
            child: Padding(padding: const EdgeInsets.all(16.0), child: Text(_benchResult, style: const TextStyle(fontSize: 16))),
          ),
        ],
      ),
    );
  }
}
