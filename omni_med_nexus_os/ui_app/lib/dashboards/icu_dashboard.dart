import 'package:flutter/material.dart';
import 'dart:async';
import 'package:flutter/foundation.dart' show kIsWeb;

class IcuDashboard extends StatefulWidget {
  const IcuDashboard({super.key});
  @override
  State<IcuDashboard> createState() => _IcuDashboardState();
}

class _IcuDashboardState extends State<IcuDashboard> {
  String _hardwareStatus = "Connecting to Tauri Hardware Bridge...";
  String _hr = "--";
  String _spo2 = "--";
  String _bp = "--/--";

  @override
  void initState() {
    super.initState();
    _connectTauriEvent();
  }

  void _connectTauriEvent() {
    // We mock the stream locally because we are simulating the Tauri background process emitting events
    Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _hardwareStatus = "🟢 ICU-Bed-01 (Tauri Active)";
          _hr = (70 + timer.tick % 15).toString();
          _spo2 = "98";
          _bp = "120/80";
        });
      }
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
                  color: Colors.black45, borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.greenAccent),
                ),
                child: Text("Hardware: $_hardwareStatus", style: const TextStyle(fontSize: 12, color: Colors.greenAccent)),
              )
            ],
          ),
          const SizedBox(height: 20),
          Expanded(
            child: Row(
              children: [
                _buildMetricBox("Heart Rate", _hr, "bpm", Colors.green),
                const SizedBox(width: 20),
                _buildMetricBox("SpO2", _spo2, "%", Colors.lightBlue),
                const SizedBox(width: 20),
                _buildMetricBox("Blood Pressure", _bp, "mmHg", Colors.orange),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildMetricBox(String title, String val, String unit, Color color) {
    return Expanded(
      child: Container(
        decoration: BoxDecoration(color: Colors.blueGrey.shade900, borderRadius: BorderRadius.circular(16)),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(title, style: TextStyle(color: color, fontSize: 24)),
            Text(val, style: TextStyle(color: color, fontSize: 80, fontWeight: FontWeight.bold)),
            Text(unit, style: TextStyle(color: color, fontSize: 20)),
          ],
        ),
      ),
    );
  }
}
