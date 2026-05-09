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
        scaffoldBackgroundColor: const Color(0xFF0F172A),
      ),
      home: const LoginRouter(),
    );
  }
}

// 1. RBAC Router
class LoginRouter extends StatefulWidget {
  const LoginRouter({super.key});
  @override
  State<LoginRouter> createState() => _LoginRouterState();
}

class _LoginRouterState extends State<LoginRouter> {
  UserProfile? _user;

  void _login(String role) async {
    final profile = await loginMock(username: role);
    setState(() => _user = profile);
  }

  @override
  Widget build(BuildContext context) {
    if (_user == null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text("OMNI-MED NEXUS OS", style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold, color: Colors.tealAccent)),
              const SizedBox(height: 10),
              const Text("Login to Access Role Workspace", style: TextStyle(fontSize: 16)),
              const SizedBox(height: 40),
              Wrap(
                spacing: 10, runSpacing: 10,
                children: [
                  ElevatedButton(onPressed: () => _login("dr_er"), child: const Text("Login Sp.EM (ER)")),
                  ElevatedButton(onPressed: () => _login("dr_neuro"), child: const Text("Login Sp.BS (Neuro)")),
                  ElevatedButton(onPressed: () => _login("dr_psych"), child: const Text("Login Sp.KJ (Psych)")),
                  ElevatedButton(onPressed: () => _login("exec_cfo"), child: const Text("Login CFO (Exec)")),
                  ElevatedButton(onPressed: () => _login("holding_audit"), child: const Text("Login Group Auditor")),
                ],
              )
            ],
          ),
        ),
      );
    }

    return RoleDashboard(user: _user!);
  }
}

class RoleDashboard extends StatelessWidget {
  final UserProfile user;
  const RoleDashboard({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 800;

    Widget content;
    switch (user.role) {
      case UserRole.SpEM: content = const ERDashboard(); break;
      case UserRole.SpBS: content = const NeuroDashboard(); break;
      case UserRole.SpKJ: content = const PsychDashboard(); break;
      case UserRole.CFO: content = const ExecDashboard(); break;
      case UserRole.GroupAuditor: content = const StrategicDashboard(); break;
      default: content = const Center(child: Text("Template Cluster"));
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('${user.name} - Workspace', style: const TextStyle(color: Colors.tealAccent)),
        backgroundColor: const Color(0xFF1E293B),
        actions: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            alignment: Alignment.center,
            child: const Text("AES-256-GCM Secured", style: TextStyle(color: Colors.greenAccent, fontSize: 12)),
          )
        ],
      ),
      body: content,
    );
  }
}

// 2. ER Specialist (Sp.EM) - Minimalist Alert Mode
class ERDashboard extends StatelessWidget {
  const ERDashboard({super.key});
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          color: Colors.red.withOpacity(0.8),
          child: const Text("CRITICAL: 2 Patients in RED ZONE. Wait time 0 mins.", style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
        ),
        const SizedBox(height: 20),
        ListTile(
          tileColor: Colors.black26,
          leading: const Icon(Icons.warning, color: Colors.orange),
          title: const Text("Patient B - YELLOW (Fracture)"),
          subtitle: const Text("Wait time: 15 mins"),
        ),
        const SizedBox(height: 20),
        ElevatedButton.icon(
          onPressed: () {},
          icon: const Icon(Icons.emergency),
          label: const Text("Dispatch Ambulance (Auto-Routing)"),
          style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
        )
      ],
    );
  }
}

// 3. Neurosurgeon (Sp.BS) - Holographic Pre-Op
class NeuroDashboard extends StatelessWidget {
  const NeuroDashboard({super.key});
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Padding(
          padding: EdgeInsets.all(16.0),
          child: Text("Holographic Surgical Pre-Op (Neural Navigation)", style: TextStyle(fontSize: 20, color: Colors.cyanAccent)),
        ),
        Expanded(
          child: Container(
            margin: const EdgeInsets.all(16),
            decoration: BoxDecoration(border: Border.all(color: Colors.cyanAccent)),
            child: Flutter3DViewer(
              controller: Flutter3DController(),
              src: 'https://modelviewer.dev/shared-assets/models/Brain.glb', // Simulating 3D Brain DICOM
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: ElevatedButton(onPressed: () {}, child: const Text("Sync Navigation to OR-1")),
        )
      ],
    );
  }
}

// 4. Psychiatrist (Sp.KJ) - Ultra Encrypted
class PsychDashboard extends StatefulWidget {
  const PsychDashboard({super.key});
  @override
  State<PsychDashboard> createState() => _PsychDashboardState();
}

class _PsychDashboardState extends State<PsychDashboard> {
  String _saved = "";
  void _saveNotes() async {
    final res = await saveEncryptedTherapyNotes(notes: "Patient shows sign of mild depression.");
    setState(() => _saved = res);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("Psychopharmacology & Therapy Notes", style: TextStyle(fontSize: 20, color: Colors.purpleAccent)),
          const SizedBox(height: 10),
          const TextField(
            maxLines: 5,
            decoration: InputDecoration(hintText: "Enter private therapy notes...", border: OutlineOutlineInputBorder()),
          ),
          const SizedBox(height: 10),
          ElevatedButton(onPressed: _saveNotes, child: const Text("Save & Encrypt (Zero-Knowledge)")),
          const SizedBox(height: 10),
          Text(_saved, style: const TextStyle(color: Colors.greenAccent, fontFamily: 'monospace')),
        ],
      ),
    );
  }
}

// 5. CFO (Exec)
class ExecDashboard extends StatelessWidget {
  const ExecDashboard({super.key});
  @override
  Widget build(BuildContext context) {
    return const Center(child: Text("CFO Dashboard: Revenue Guard & Digital Twin Simulation Placeholder", style: TextStyle(fontSize: 20)));
  }
}

// 6. Group Auditor (Strategic)
class StrategicDashboard extends StatelessWidget {
  const StrategicDashboard({super.key});
  @override
  Widget build(BuildContext context) {
    return const Center(child: Text("Group Auditor: Global Blockchain Audit Trail Placeholder", style: TextStyle(fontSize: 20)));
  }
}
