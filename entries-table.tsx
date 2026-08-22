"use client";

import { Trash, Plus, AlertCircle } from "lucide-react";
import { TimeEntry, Worker, computeDay, fmtHr, toISO, uid } from "@/lib/payroll";

interface EntriesTableProps {
  workers: Worker[];
  entries: TimeEntry[];
  onChange: (entries: TimeEntry[]) => void;
}

export function EntriesTable({ workers, entries, onChange }: EntriesTableProps) {
  const update = (id: string, patch: Partial<TimeEntry>) =>
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const remove = (id: string) => onChange(entries.filter((e) => e.id !== id));

  const addManual = () =>
    onChange([
      ...entries,
      {
        id: uid(),
        workerId: workers[0]?.id ?? "",
        date: toISO(new Date()),
        timeIn: "07:00",
        timeOut: "16:00",
      },
    ]);

  const sorted = [...entries].sort((a, b) =>
    a.date === b.date ? a.workerId.localeCompare(b.workerId) : a.date.localeCompare(b.date)
  );

  const workerName = (id: string) => workers.find((w) => w.id === id)?.name ?? id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#8fa08f]">
          {entries.length} entr{entries.length === 1 ? "y" : "ies"} — RH &amp; OT auto-computed
          (7:00 AM – 4:00 PM schedule, OT past 4:00 PM)
        </p>
        <button
          onClick={addManual}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#4d6b52] px-3 py-1.5 text-xs font-semibold text-[#b8d4bc] transition hover:bg-[#16211a]"
        >
          <Plus className="h-3.5 w-3.5" /> Manual entry
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-[#2e3d31] bg-[#121a14] p-10 text-center text-sm text-[#8fa08f]">
          No time entries yet — upload timemark images or add a manual entry.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#2e3d31]">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-[#16211a] text-left text-[11px] uppercase tracking-[0.15em] text-[#8fa08f]">
                <th className="px-3 py-2.5">Worker</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Time In</th>
                <th className="px-3 py-2.5">Time Out</th>
                <th className="px-3 py-2.5 text-right">RH</th>
                <th className="px-3 py-2.5 text-right">OT</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="[font-family:var(--font-plex)]">
              {sorted.map((e) => {
                const c = computeDay(e.timeIn, e.timeOut);
                const incomplete = !e.timeIn || !e.timeOut;
                return (
                  <tr key={e.id} className="border-t border-[#1e2a21] bg-[#0f1611] hover:bg-[#121a14]">
                    <td className="px-3 py-2">
                      <select
                        value={e.workerId}
                        onChange={(ev) => update(e.id, { workerId: ev.target.value })}
                        className="rounded-md border border-[#2e3d31] bg-[#0d120e] px-2 py-1 text-xs"
                      >
                        {workers.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                        {!workers.some((w) => w.id === e.workerId) && (
                          <option value={e.workerId}>{workerName(e.workerId)}</option>
                        )}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={e.date}
                        onChange={(ev) => update(e.id, { date: ev.target.value })}
                        className="rounded-md border border-[#2e3d31] bg-[#0d120e] px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        value={e.timeIn}
                        onChange={(ev) => update(e.id, { timeIn: ev.target.value })}
                        className="rounded-md border border-[#2e3d31] bg-[#0d120e] px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        value={e.timeOut}
                        onChange={(ev) => update(e.id, { timeOut: ev.target.value })}
                        className="rounded-md border border-[#2e3d31] bg-[#0d120e] px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-[#b8d4bc]">
                      {fmtHr(c.rh)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-[#ffd23f]">
                      {fmtHr(c.ot)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {incomplete && (
                          <span title="Missing time in/out">
                            <AlertCircle className="h-4 w-4 text-amber-400" />
                          </span>
                        )}
                        <button
                          onClick={() => remove(e.id)}
                          className="text-[#8fa08f] transition hover:text-red-400"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
