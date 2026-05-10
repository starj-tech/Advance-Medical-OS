import 'package:flutter/material.dart';
import '../src/rust/api.dart';

class IcuDashboard extends StatefulWidget {
  const IcuDashboard({super.key});
  @override
  State<IcuDashboard> createState() => _IcuDashboardState();
}

class _IcuDashboardState extends State<IcuDashboard> {
  String _sofa = "Calculating...";
  String _hardwareStatus = "Checking device connection...";

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() async {
    // Initialize standard mock hardware array
    initializeHardwareGateways();
    final hw = await getHardwareStatus(protocolFilter: "MQTT");
    final res = await calculateSofaScore(pao2: 250, platelets: 80, bilirubin: 1.5, map: 65, gcs: 12, creatinine: 2.5);
    setState(() {
      _hardwareStatus = hw;
      _sofa = res;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("Intensivist Workspace (ICU)", style: TextStyle(fontSize: 24, color: Colors.blueAccent)),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.black45,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: _hardwareStatus.contains("🟢") ? Colors.green : Colors.red),
                ),
                child: Text("NexusConnect: $_hardwareStatus", style: const TextStyle(fontSize: 12)),
              )
            ],
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(20),
            color: _sofa.contains("HIGH") ? Colors.red.withOpacity(0.8) : Colors.green.withOpacity(0.8),
            child: Text(_sofa, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 20),
          const Text("Real-time telemetry and life support modules hooked to NCE.", style: TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }
}
