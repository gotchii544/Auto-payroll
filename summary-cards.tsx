"use client";

import { Clock, Zap, DollarSign } from "lucide-react";
import { ComputedEntry } from "@/types";
import { formatPeso, round2 } from "@/lib/payroll";

interface SummaryCardsProps {
  workers: string[];
  entries: ComputedEntry[];
}

export function SummaryCards({ workers, entries }: SummaryCardsProps) {
  const grand = entries.reduce((s, e) => s + e.totalPay, 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workers.map((w) => {
        const rows = entries.filter((e) => e.worker === w);
        const reg = round2(rows.reduce((s, e) => s + e.regularHours, 0));
        const ot = round2(rows.reduce((s, e) => s + e.overtimeHours, 0));
        const pay = round2(rows.reduce((s, e) => s + e.totalPay, 0));
        return (
          <div
            key={w}
            className="relative overflow-hidden rounded-md border border-zinc-800 bg-zinc-900/50 p-5"
          >
            <div className="absolute inset-x-0 top-0 h-0.5 bg-amber-500/70" />
            <p className="font-display text-lg uppercase tracking-[0.3em] text-zinc-100">{w}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-zinc-500" /> {reg.toFixed(2)} reg hrs
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-400" /> {ot.toFixed(2)} OT hrs
              </span>
            </div>
            <p className="mt-4 font-mono text-3xl font-bold text-emerald-400">{formatPeso(pay)}</p>
            <p className="font-mono text-[10px] tracking-widest text-zinc-600">
              {rows.length} DAY{rows.length === 1 ? "" : "S"} LOGGED
            </p>
          </div>
        );
      })}
      <div className="relative overflow-hidden rounded-md border border-amber-500/40 bg-amber-500/5 p-5">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-amber-500" />
        <p className="font-display text-lg uppercase tracking-[0.3em] text-amber-400">
          TOTAL PAYROLL
        </p>
        <div className="mt-4 flex items-center gap-1.5 font-mono text-xs text-zinc-400">
          <DollarSign className="h-3.5 w-3.5 text-amber-400" /> All workers, selected period
        </div>
        <p className="mt-4 font-mono text-3xl font-bold text-amber-400">
          {formatPeso(round2(grand))}
        </p>
        <p className="font-mono text-[10px] tracking-widest text-zinc-600">
          {entries.length} ENTRIES
        </p>
      </div>
    </div>
  );
}
