import 'package:flutter/material.dart';
import 'package:ui_app/src/rust/frb_generated.dart';
import 'package:ui_app/src/rust/api.dart';
import 'dashboards/router.dart';

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
      home: const LoginSelector(),
    );
  }
}

class LoginSelector extends StatefulWidget {
  const LoginSelector({super.key});
  @override
  State<LoginSelector> createState() => _LoginSelectorState();
}

class _LoginSelectorState extends State<LoginSelector> {
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
          child: SingleChildScrollView(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text("OMNI-MED NEXUS OS", style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold, color: Colors.tealAccent)),
                const SizedBox(height: 10),
                const Text("Login to Access Specific Clinical Clusters", style: TextStyle(fontSize: 16)),
                const SizedBox(height: 40),
                Wrap(
                  spacing: 10, runSpacing: 10,
                  alignment: WrapAlignment.center,
                  children: [
                    ElevatedButton(onPressed: () => _login("dr_er"), child: const Text("Sp.EM (ER/Triage)")),
                    ElevatedButton(onPressed: () => _login("dr_anes"), child: const Text("Sp.An (Anesthesiologist)")),
                    ElevatedButton(onPressed: () => _login("dr_icu"), child: const Text("Intensivist (ICU)")),
                    ElevatedButton(onPressed: () => _login("dr_neuro"), child: const Text("Sp.BS (Neurosurgeon)")),
                    ElevatedButton(onPressed: () => _login("dr_ortho"), child: const Text("Sp.OT (Orthopedic)")),
                    ElevatedButton(onPressed: () => _login("dr_cardio_surg"), child: const Text("Sp.BKV (Cardiac Surg)")),
                    ElevatedButton(onPressed: () => _login("dr_psych"), child: const Text("Sp.KJ (Psychiatrist)")),
                    ElevatedButton(onPressed: () => _login("exec_cfo"), child: const Text("CFO (Operational)")),
                    ElevatedButton(onPressed: () => _login("holding_audit"), child: const Text("Group Auditor")),
                  ],
                )
              ],
            ),
          ),
        ),
      );
    }
    return RoleDashboardRouter(user: _user!);
  }
}
