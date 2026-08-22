"use client";

import { Plus, Trash } from "lucide-react";
import { Worker, fmtMoney, otRatePerHr, ratePerHr, uid } from "@/lib/payroll";

interface WorkersPanelProps {
  workers: Worker[];
  onChange: (workers: Worker[]) => void;
}

export function WorkersPanel({ workers, onChange }: WorkersPanelProps) {
  const update = (id: string, patch: Partial<Worker>) =>
    onChange(workers.map((w) => (w.id === id ? { ...w, ...patch } : w)));

  const remove = (id: string) => onChange(workers.filter((w) => w.id !== id));

  const add = () =>
    onChange([...workers, { id: uid(), name: "NEW WORKER", dailyRate: 600 }]);

  return (
    <div className="rounded-xl border border-[#2e3d31] bg-[#121a14] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#8fa08f]">Workers &amp; Rates</h3>
        <button
          onClick={add}
          className="inline-flex items-center gap-1 rounded-md border border-[#4d6b52] px-2.5 py-1 text-[11px] font-semibold text-[#b8d4bc] transition hover:bg-[#16211a]"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
      <div className="space-y-2">
        {workers.map((w) => (
          <div key={w.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-[#0f1611] p-2">
            <input
              value={w.name}
              onChange={(e) => update(w.id, { name: e.target.value.toUpperCase() })}
              className="min-w-[140px] flex-1 rounded-md border border-[#2e3d31] bg-[#0d120e] px-2 py-1.5 text-sm font-semibold uppercase"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase text-[#8fa08f]">Daily ₱</span>
              <input
                type="number"
                min={0}
                value={w.dailyRate}
                onChange={(e) => update(w.id, { dailyRate: parseFloat(e.target.value) || 0 })}
                className="w-24 rounded-md border border-[#2e3d31] bg-[#0d120e] px-2 py-1.5 text-right text-sm [font-family:var(--font-plex)]"
              />
            </div>
            <div className="text-[11px] text-[#8fa08f] [font-family:var(--font-plex)]">
              /hr {fmtMoney(ratePerHr(w))} · OT/hr{" "}
              <span className="text-[#ffd23f]">{fmtMoney(otRatePerHr(w))}</span>
            </div>
            <button onClick={() => remove(w.id)} className="ml-auto text-[#8fa08f] hover:text-red-400">
              <Trash className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
