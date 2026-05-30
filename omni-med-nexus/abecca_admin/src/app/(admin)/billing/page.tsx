import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import type { InvoiceStatus } from "@/lib/types";
import { getInvoices, invoiceTotal } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate, formatIDR } from "@/lib/utils";

export const metadata: Metadata = { title: "Billing" };

const statusVariant: Record<InvoiceStatus, "success" | "warning" | "danger"> = {
  paid: "success",
  pending: "warning",
  overdue: "danger",
};

export default async function BillingPage() {
  const invoices = await getInvoices();
  const paid = invoices.filter((i) => i.status === "paid");
  const outstanding = invoices.filter((i) => i.status !== "paid");
  const collected = paid.reduce((s, i) => s + invoiceTotal(i), 0);
  const due = outstanding.reduce((s, i) => s + invoiceTotal(i), 0);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Patient invoices built from the procedure tariff catalogue (IDR).
      </p>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Collected" value={formatIDR(collected)} icon={Receipt} tone="success" />
        <StatCard label="Outstanding" value={formatIDR(due)} icon={Receipt} tone="warning" />
        <StatCard label="Open Invoices" value={outstanding.length} icon={Receipt} />
      </section>

      <div className="flex flex-col gap-4">
        {invoices.map((inv) => (
          <Card key={inv.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {inv.id}
                </span>
                {inv.patientName}
                <Badge variant={statusVariant[inv.status]}>{inv.status}</Badge>
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {formatDate(inv.issuedAt)}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {inv.lines.map((l) => (
                  <li
                    key={l.procedureCode}
                    className="flex items-center gap-4 px-5 py-2.5 text-sm"
                  >
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {l.procedureCode}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {l.procedureName}
                    </span>
                    <span className="tabular-nums">{formatIDR(l.amount)}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between bg-foreground/[0.02] px-5 py-3 text-sm font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{formatIDR(invoiceTotal(inv))}</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
