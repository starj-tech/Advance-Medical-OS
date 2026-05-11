import 'package:flutter/material.dart';

class NeumorphicCard extends StatelessWidget {
  final Widget child;
  const NeumorphicCard({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(8.0),
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: const Color(0xFFE0F7FA),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: Colors.grey.shade400, offset: const Offset(5, 5), blurRadius: 10),
          const BoxShadow(color: Colors.white, offset: Offset(-5, -5), blurRadius: 10),
        ],
      ),
      child: child,
    );
  }
}
