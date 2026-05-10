import 'package:flutter/material.dart';
import '../src/rust/api.dart';
import 'primary_care_dashboards.dart';

class RadioDashboard extends StatefulWidget {
  const RadioDashboard({super.key});
  @override
  State<RadioDashboard> createState() => _RadioDashboardState();
}

class _RadioDashboardState extends State<RadioDashboard> {
  String _ai = "Scanning DICOM...";
  String _hardwareStatus = "Checking device connection...";
  double _contrast = 1.0;
  bool _invert = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() async {
    initializeHardwareGateways();
    final hw = await getHardwareStatus(protocolFilter: "DICOM");
    final res = await detectLesionAi(dicomHash: "image_101");
    setState(() {
      _hardwareStatus = hw;
      _ai = res;
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
              const Text("Radiologist Workspace (Deep Contrast Mode)", style: TextStyle(fontSize: 24, color: Colors.tealAccent)),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Colors.black45, borderRadius: BorderRadius.circular(8), border: Border.all(color: _hardwareStatus.contains("🔴") ? Colors.red : Colors.yellow)),
                child: Text("NexusConnect: $_hardwareStatus", style: const TextStyle(fontSize: 12)),
              )
            ],
          ),
          const SizedBox(height: 20),
          Expanded(
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: Container(
                    decoration: BoxDecoration(color: Colors.black, border: Border.all(color: Colors.white24)),
                    // Applying High-Contrast Filter Mock via ColorFiltered
                    child: ColorFiltered(
                      colorFilter: _invert
                        ? const ColorFilter.matrix([ -1,0,0,0,255, 0,-1,0,0,255, 0,0,-1,0,255, 0,0,0,1,0 ])
                        : ColorFilter.mode(Colors.black.withOpacity(1.0 - _contrast), BlendMode.dstOut),
                      child: const Center(child: Icon(Icons.blur_on, size: 200, color: Colors.white)),
                    ),
                  ),
                ),
                const SizedBox(width: 20),
                Expanded(
                  flex: 1,
                  child: Column(
                    children: [
                      Card(
                        color: Colors.blueGrey.shade800,
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Text(_ai, style: const TextStyle(color: Colors.orangeAccent, fontSize: 18, fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(height: 30),
                      const Text("Contrast Control", style: TextStyle(color: Colors.grey)),
                      Slider(value: _contrast, min: 0.1, max: 1.0, onChanged: (v) => setState(() => _contrast = v)),
                      SwitchListTile(title: const Text("Invert Colors"), value: _invert, onChanged: (v) => setState(() => _invert = v)),
                      const SizedBox(height: 30),
                      ElevatedButton.icon(onPressed: (){}, icon: const Icon(Icons.mic), label: const Text("Voice-to-Report"))
                    ],
                  ),
                )
              ],
            ),
          ),
        ],
      ),
    );
  }
}
