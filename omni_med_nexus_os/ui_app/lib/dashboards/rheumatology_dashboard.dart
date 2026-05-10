import 'package:flutter/material.dart';
import '../src/rust/api.dart';
import 'primary_care_dashboards.dart';

class RheumatologyDashboard extends StatefulWidget {
  const RheumatologyDashboard({super.key});
  @override
  State<RheumatologyDashboard> createState() => _RheumatologyDashboardState();
}

class _RheumatologyDashboardState extends State<RheumatologyDashboard> {
  String _das28 = "Calculating DAS28...";
  List<Offset> _swollenJoints = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() async {
    final res = await runDas28Licensed();
    setState(() => _das28 = res);
  }

  void _addJoint(TapDownDetails details) {
    setState(() {
      _swollenJoints.add(details.localPosition);
      _loadData(); // Mock re-calculating when a new joint is tapped
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_das28.contains("PAYWALL")) return buildPaywall(_das28);

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          // Human Body Map Simulation using CustomPaint over an Icon
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const Text("Human Body Map (Tap joints to mark Swelling/Tenderness)", style: TextStyle(fontSize: 18, color: Colors.orangeAccent)),
                const SizedBox(height: 20),
                Expanded(
                  child: GestureDetector(
                    onTapDown: _addJoint,
                    child: Container(
                      width: 300,
                      decoration: BoxDecoration(
                        color: Colors.black26,
                        border: Border.all(color: Colors.orangeAccent),
                        borderRadius: BorderRadius.circular(16)
                      ),
                      child: CustomPaint(
                        foregroundPainter: JointPainter(_swollenJoints),
                        child: const Icon(Icons.accessibility_new, size: 300, color: Colors.grey),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            flex: 1,
            child: Card(
              color: Colors.blueGrey.shade900,
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text("DAS28 Score (Auto-Calc)", style: TextStyle(fontSize: 20, color: Colors.tealAccent)),
                    const SizedBox(height: 20),
                    Text(
                      _das28,
                      style: const TextStyle(fontSize: 24, color: Colors.orangeAccent, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 30),
                    ElevatedButton(onPressed: () => setState((){ _swollenJoints.clear(); }), child: const Text("Reset Body Map"))
                  ],
                ),
              ),
            )
          )
        ],
      ),
    );
  }
}

class JointPainter extends CustomPainter {
  final List<Offset> joints;
  JointPainter(this.joints);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.redAccent.withOpacity(0.8)
      ..style = PaintingStyle.fill;

    for (var pos in joints) {
      canvas.drawCircle(pos, 10, paint);
      // Draw outer pulse
      paint.color = Colors.redAccent.withOpacity(0.3);
      canvas.drawCircle(pos, 20, paint);
      paint.color = Colors.redAccent.withOpacity(0.8);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
