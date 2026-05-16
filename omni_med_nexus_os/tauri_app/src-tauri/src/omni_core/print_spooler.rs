pub fn trigger_print_job(payload_json: &str) -> String {
    // In a real app, this sends RAW bytes to the local USB/LPT port of a Zebra/Epson thermal printer
    // Completely bypassing the browser window.print() dialog.
    println!("SPOOLER [THERMAL_PRINTER_01] -> Printing Job: {}", payload_json);
    "SUCCESS: Print job spooled silently to Thermal Printer.".into()
}
