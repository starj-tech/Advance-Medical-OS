import 'package:flutter/material.dart';
import 'package:ui_app/src/rust/api/blockchain_api.dart';
import 'package:ui_app/src/rust/frb_generated.dart';
import 'theme/pulse_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await RustLib.init();
  runApp(const OmniMedNexusOS());
}

class OmniMedNexusOS extends StatelessWidget {
  const OmniMedNexusOS({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Omni-Med Nexus OS',
      theme: PulseDesignSystem.themeData,
      home: const MainDashboard(),
    );
  }
}

class MainDashboard extends StatefulWidget {
  const MainDashboard({super.key});

  @override
  State<MainDashboard> createState() => _MainDashboardState();
}

class _MainDashboardState extends State<MainDashboard> {
  int _selectedIndex = 0;

  static const List<Widget> _pages = <Widget>[
    ClinicalModule(),
    OperationalModule(),
    StrategicModule(),
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Omni-Med Nexus OS', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.favorite, color: PulseDesignSystem.greenOrganic),
            onPressed: () {},
          ),
        ],
      ),
      body: _pages[_selectedIndex],
      bottomNavigationBar: BottomNavigationBar(
        items: const <BottomNavigationBarItem>[
          BottomNavigationBarItem(
            icon: Icon(Icons.medical_services),
            label: 'Clinical',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings),
            label: 'Operational',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.insights),
            label: 'Strategic',
          ),
        ],
        currentIndex: _selectedIndex,
        selectedItemColor: PulseDesignSystem.bluePrimary,
        onTap: _onItemTapped,
      ),
    );
  }
}

class ClinicalModule extends StatefulWidget {
  const ClinicalModule({super.key});

  @override
  State<ClinicalModule> createState() => _ClinicalModuleState();
}

class _ClinicalModuleState extends State<ClinicalModule> {
  String _latestHash = "No interactions yet";
  int _chainLength = 1;

  void _addAuditRecord() {
    final hash = addAuditRecord(
      patientId: "PAT-001",
      action: "UPDATE_DIAGNOSIS",
      doctorId: "DOC-999"
    );
    final length = getChainLength();

    setState(() {
      _latestHash = hash;
      _chainLength = length.toInt();
    });
  }

  @override
  void initState() {
    super.initState();
    _chainLength = getChainLength().toInt();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: PulseDesignSystem.cyanLight.withOpacity(0.2),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: PulseDesignSystem.cyanLight, width: 2),
            ),
            child: const Text(
              'Clinical Module',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w500, color: PulseDesignSystem.bluePrimary),
            ),
          ),
          const SizedBox(height: 40),
          ElevatedButton(
            onPressed: _addAuditRecord,
            child: const Text('Update Patient Diagnosis (Blockchain Audit)'),
          ),
          const SizedBox(height: 20),
          Text('Audit Trail Blocks: $_chainLength', style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text('Latest Immutable Hash:'),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Text(
              _latestHash,
              style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: PulseDesignSystem.darkNavy),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }
}

class OperationalModule extends StatelessWidget {
  const OperationalModule({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text('Operational Module - Redis Cache Active', style: TextStyle(fontSize: 20, color: PulseDesignSystem.darkNavy)),
    );
  }
}

class StrategicModule extends StatelessWidget {
  const StrategicModule({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text('Strategic Module - Postgres Analytics Active', style: TextStyle(fontSize: 20, color: PulseDesignSystem.darkNavy)),
    );
  }
}
