"use client";

import { Check, RotateCcw, Receipt } from "lucide-react";
import type { InvoiceStatus } from "@/lib/types";
import { invoiceTotal } from "@/lib/data";
import { setInvoiceStatus, useInvoices } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate, formatIDR } from "@/lib/utils";

const statusVariant: Record<InvoiceStatus, "success" | "warning" | "danger"> = {
  paid: "success",
  pending: "warning",
  overdue: "danger",
};

export function BillingView() {
  const invoices = useInvoices();
  const paid = invoices.filter((i) => i.status === "paid");
  const outstanding = invoices.filter((i) => i.status !== "paid");
  const collected = paid.reduce((s, i) => s + invoiceTotal(i), 0);
  const due = outstanding.reduce((s, i) => s + invoiceTotal(i), 0);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <p className="text-sm text-muted-foreground">
        Patient invoices built from the procedure tariff catalogue (IDR). Mark
        an invoice paid and the totals update live.
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
                <li className="flex items-center justify-between gap-3 bg-foreground/[0.02] px-5 py-3">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="flex items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatIDR(invoiceTotal(inv))}
                    </span>
                    {inv.status === "paid" ? (
                      <Button
                        variant="ghost"
                        className="h-8 px-2.5 text-xs"
                        onClick={() => setInvoiceStatus(inv.id, "pending")}
                      >
                        <RotateCcw className="size-3.5" />
                        Reopen
                      </Button>
                    ) : (
                      <Button
                        className="h-8 px-2.5 text-xs"
                        onClick={() => setInvoiceStatus(inv.id, "paid")}
                      >
                        <Check className="size-3.5" />
                        Mark paid
                      </Button>
                    )}
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
