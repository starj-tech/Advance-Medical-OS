#!/bin/bash
cat << 'INNER_EOF' >> omni_med_nexus_os/ui_app/lib/dashboards/router.dart
// Executive Dashboard implementation with NexusConnect Shadow Migration status
class ExecDashboard extends StatefulWidget {
  const ExecDashboard({super.key});
  @override
  State<ExecDashboard> createState() => _ExecDashboardState();
}

class _ExecDashboardState extends State<ExecDashboard> {
  String _migrationStatus = "Loading migration status...";
  List<String> _hardware = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() async {
    initializeHardwareGateways();
    final migration = await getShadowMigrationStatus();
    final hw = await getAllHardwareSummary();
    setState(() {
      _migrationStatus = migration;
      _hardware = hw;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: ListView(
        children: [
          const Text("CFO/CEO Operations", style: TextStyle(fontSize: 24, color: Colors.blueAccent)),
          const SizedBox(height: 20),
          Card(
            color: Colors.blueGrey.shade800,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("The Great Migration (ETL Engine)", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 10),
                  Text(_migrationStatus, style: const TextStyle(color: Colors.greenAccent)),
                  const SizedBox(height: 20),
                  const Text("NexusConnect Fleet Connectivity", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 10),
                  ..._hardware.map((h) => Text(h, style: const TextStyle(color: Colors.cyanAccent, fontFamily: 'monospace'))).toList(),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }
}
INNER_EOF
