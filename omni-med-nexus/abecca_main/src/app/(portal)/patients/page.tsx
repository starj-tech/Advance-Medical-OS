import type { Metadata } from "next";
import { getPatients } from "@/lib/data";
import { PatientsTable } from "./patients-table";

export const metadata: Metadata = { title: "Patients" };

export default async function PatientsPage() {
  const patients = await getPatients();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-muted-foreground">
          Live roster sorted by clinical acuity. PII stays encrypted in the core
          engine — only masked identifiers are shown here.
        </p>
      </div>
      <PatientsTable patients={patients} />
    </div>
  );
}
