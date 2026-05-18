import 'package:flutter/material.dart';
import 'package:ui_app/src/rust/api/blockchain_api.dart';
import 'package:ui_app/src/rust/api/clinical_ai.dart';
import 'package:ui_app/src/rust/api/strategic_finance.dart';
import 'package:ui_app/src/rust/api/operational_redis.dart';
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
            label: 'Clinical (AI)',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings),
            label: 'Operational (Redis)',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.insights),
            label: 'Strategic (Postgres)',
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
  final TextEditingController _aiSearchController = TextEditingController();
  List<String> _aiResults = [];

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

  void _performAISearch() {
    if (_aiSearchController.text.isNotEmpty) {
      final results = simulateSemanticSearch(query: _aiSearchController.text);
      setState(() {
        _aiResults = results;
      });
    }
  }

  @override
  void initState() {
    super.initState();
    _chainLength = getChainLength().toInt();
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
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
                  'Clinical Module (AI & Blockchain)',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.w500, color: PulseDesignSystem.bluePrimary),
                ),
              ),
              const SizedBox(height: 30),

              // AI Vector DB Section
              const Text('AI Vector Search', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _aiSearchController,
                      decoration: const InputDecoration(
                        hintText: "Enter symptoms (e.g., 'fever' or 'headache')",
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton(
                    onPressed: _performAISearch,
                    child: const Text('Search'),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              if (_aiResults.isNotEmpty)
                Container(
                  padding: const EdgeInsets.all(12),
                  color: Colors.grey.shade100,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: _aiResults.map((e) => Text("• $e")).toList(),
                  ),
                ),

              const SizedBox(height: 40),
              const Divider(),
              const SizedBox(height: 20),

              // Blockchain Audit Section
              const Text('Immutable Audit Trail', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 10),
              ElevatedButton(
                onPressed: _addAuditRecord,
                child: const Text('Update Patient Diagnosis (Blockchain Audit)'),
              ),
              const SizedBox(height: 20),
              Text('Audit Trail Blocks: $_chainLength', style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text('Latest Immutable Hash:'),
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
        ),
      ),
    );
  }
}

class OperationalModule extends StatefulWidget {
  const OperationalModule({super.key});

  @override
  State<OperationalModule> createState() => _OperationalModuleState();
}

class _OperationalModuleState extends State<OperationalModule> {
  int icu = 0;
  int general = 0;
  int queue = 0;

  void _refreshRedis() {
    final status = getRealtimeBedStatus();
    setState(() {
      icu = status.icuAvailable;
      general = status.generalAvailable;
      queue = status.emergencyQueue;
    });
  }

  @override
  void initState() {
    super.initState();
    _refreshRedis();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text('Operational Module - Redis Cache Active', style: TextStyle(fontSize: 20, color: PulseDesignSystem.darkNavy)),
          const SizedBox(height: 30),
          _buildStatCard("ICU Available", icu.toString(), PulseDesignSystem.bluePrimary),
          const SizedBox(height: 10),
          _buildStatCard("General Available", general.toString(), PulseDesignSystem.cyanLight),
          const SizedBox(height: 10),
          _buildStatCard("Emergency Queue", queue.toString(), Colors.redAccent),
          const SizedBox(height: 30),
          ElevatedButton(
            onPressed: _refreshRedis,
            child: const Text('Refresh Real-time Data'),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, Color color) {
    return Container(
      width: 300,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }
}

class StrategicModule extends StatefulWidget {
  const StrategicModule({super.key});

  @override
  State<StrategicModule> createState() => _StrategicModuleState();
}

class _StrategicModuleState extends State<StrategicModule> {
  double revenue = 0.0;
  double pending = 0.0;
  double expenses = 0.0;

  void _refreshFinance() {
    final report = getFinancialSummary();
    setState(() {
      revenue = report.totalRevenue;
      pending = report.pendingClaims;
      expenses = report.departmentExpenses;
    });
  }

  @override
  void initState() {
    super.initState();
    _refreshFinance();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text('Strategic Module - Postgres Analytics Active', style: TextStyle(fontSize: 20, color: PulseDesignSystem.darkNavy)),
          const SizedBox(height: 30),
          _buildFinancialStat("Total Revenue", "\$${(revenue / 1000000).toStringAsFixed(2)}M", PulseDesignSystem.greenOrganic),
          const SizedBox(height: 10),
          _buildFinancialStat("Pending Claims", "\$${(pending / 1000).toStringAsFixed(0)}K", Colors.orange),
          const SizedBox(height: 10),
          _buildFinancialStat("Department Expenses", "\$${(expenses / 1000).toStringAsFixed(0)}K", Colors.redAccent),
          const SizedBox(height: 30),
          ElevatedButton(
            onPressed: _refreshFinance,
            child: const Text('Refresh Financial Ledger'),
          ),
        ],
      ),
    );
  }

  Widget _buildFinancialStat(String title, String value, Color color) {
    return Container(
      width: 300,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(color: Colors.grey.withOpacity(0.2), spreadRadius: 2, blurRadius: 5)
        ]
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: const TextStyle(fontSize: 16)),
          Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }
}
