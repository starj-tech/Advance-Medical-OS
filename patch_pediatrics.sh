#!/bin/bash
cat << 'INNER_EOF' > omni_med_nexus_os/ui_app/lib/dashboards/pediatrics_dashboard.dart
import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

class PediatricsDashboard extends StatelessWidget {
  const PediatricsDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFF9E6), // Soft baby blue/yellow tint
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const FaIcon(FontAwesomeIcons.babyCarriage, color: Colors.blueAccent, size: 30),
                const SizedBox(width: 10),
                Text(
                  "Pediatrician: Growth & Immunization",
                  style: GoogleFonts.baloo2(fontSize: 28, color: Colors.blueAccent, fontWeight: FontWeight.bold)
                ),
              ],
            ),
            const SizedBox(height: 20),
            Expanded(
              child: Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: Card(
                      color: Colors.white,
                      elevation: 4,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("WHO Growth Chart (Height-for-Age)", style: GoogleFonts.nunito(fontSize: 18, color: Colors.black87, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 20),
                            Expanded(
                              child: LineChart(
                                LineChartData(
                                  gridData: const FlGridData(show: true, drawVerticalLine: false),
                                  titlesData: const FlTitlesData(show: true),
                                  borderData: FlBorderData(show: false),
                                  lineBarsData: [
                                    // Simulated 50th Percentile (Normal)
                                    LineChartBarData(
                                      spots: const [FlSpot(0, 50), FlSpot(1, 75), FlSpot(2, 87), FlSpot(3, 95)],
                                      isCurved: true, color: Colors.green, barWidth: 3, isStrokeCapRound: true,
                                    ),
                                    // Patient Trajectory
                                    LineChartBarData(
                                      spots: const [FlSpot(0, 48), FlSpot(1, 72), FlSpot(2, 85), FlSpot(3, 90)],
                                      isCurved: true, color: Colors.orangeAccent, barWidth: 4, dotData: const FlDotData(show: true),
                                    ),
                                  ],
                                )
                              ),
                            )
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    flex: 1,
                    child: Card(
                      color: Colors.orange.shade50,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("Immunization Tracker", style: GoogleFonts.nunito(fontSize: 18, color: Colors.deepOrange, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 10),
                            ListTile(leading: const Icon(Icons.vaccines, color: Colors.green), title: Text("HepB-1", style: GoogleFonts.nunito(color: Colors.black)), trailing: const Icon(Icons.check_circle, color: Colors.green)),
                            ListTile(leading: const Icon(Icons.vaccines, color: Colors.orange), title: Text("Polio-2 (Due)", style: GoogleFonts.nunito(color: Colors.black)), trailing: ElevatedButton(onPressed: (){}, child: const Text("Administer"))),
                          ],
                        ),
                      ),
                    ),
                  )
                ],
              ),
            )
          ],
        ),
      ),
    );
  }
}
INNER_EOF

# Replace old pediatrics stub in router
sed -i 's/import '"'"'primary_care_dashboards.dart'"'"';/import '"'"'primary_care_dashboards.dart'"'"';\nimport '"'"'pediatrics_dashboard.dart'"'"';/' omni_med_nexus_os/ui_app/lib/dashboards/router.dart
