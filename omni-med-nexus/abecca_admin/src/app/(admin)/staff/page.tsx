import type { Metadata } from "next";
import { Users } from "lucide-react";
import { getStaff } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { initials } from "@/lib/utils";

export const metadata: Metadata = { title: "Staff" };

const roleVariant = {
  Physician: "info",
  Nurse: "success",
  Pharmacist: "warning",
  Technician: "muted",
} as const;

export default async function StaffPage() {
  const staff = await getStaff();
  const onDuty = staff.filter((s) => s.onDuty).length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Clinical and operational staff directory with shift status.
      </p>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Staff" value={staff.length} icon={Users} />
        <StatCard label="On Duty" value={onDuty} icon={Users} tone="success" />
        <StatCard label="Off Duty" value={staff.length - onDuty} icon={Users} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {staff.map((s) => (
              <li key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initials(s.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.id} · {s.department}
                  </p>
                </div>
                <Badge variant={roleVariant[s.role]}>{s.role}</Badge>
                <span className="hidden w-20 text-sm text-muted-foreground sm:block">
                  {s.shift}
                </span>
                <span
                  className={
                    s.onDuty
                      ? "inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                      : "inline-flex items-center gap-1.5 text-xs text-muted-foreground"
                  }
                >
                  <span
                    className={
                      s.onDuty
                        ? "size-1.5 rounded-full bg-emerald-500"
                        : "size-1.5 rounded-full bg-muted-foreground/40"
                    }
                  />
                  {s.onDuty ? "On duty" : "Off"}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
