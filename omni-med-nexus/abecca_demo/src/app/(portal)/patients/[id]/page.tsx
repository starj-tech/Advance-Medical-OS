import type { Metadata } from "next";
import { PatientDetail } from "./patient-detail";

export const metadata: Metadata = { title: "Patient Record" };

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PatientDetail id={id} />;
}
