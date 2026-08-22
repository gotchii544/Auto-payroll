"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, Camera, Clock, Settings } from "lucide-react";
import { UploadZone, ConfirmedPunch } from "@/components/upload-zone";
import { EntriesTable } from "@/components/entries-table";
import { PayrollTable } from "@/components/payroll-table";
import { WorkersPanel } from "@/components/workers-panel";
import {
  DEFAULT_WORKERS,
  Deductions,
  EMPTY_DEDUCTIONS,
  TimeEntry,
  Worker,
  buildPayroll,
  toISO,
  uid,
  weekStart,
} from "@/lib/payroll";
import { cn } from "@/lib/utils";

type Tab = "timemarks" | "entries" | "payroll";

const STORAGE_KEY = "timemark-payroll-v1";

export default function Home() {
  const [tab, setTab] = useState<Tab>("timemarks");
  const [workers, setWorkers] = useState<Worker[]>(DEFAULT_WORKERS);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [deductions, setDeductions] = useState<Record<string, Deductions>>({});
  const [selectedWeek, setSelectedWeek] = useState<string>(weekStart(toISO(new Date())));
  const [showSettings, setShowSettings] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load / persist
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (Array.isArray(s.workers) && s.workers.length) setWorkers(s.workers);
        if (Array.isArray(s.entries)) setEntries(s.entries);
        if (s.deductions) setDeductions(s.deductions);
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ workers, entries, deductions }));
  }, [workers, entries, deductions, loaded]);

  const addPunches = (punches: ConfirmedPunch[]) => {
    setEntries((prev) => {
      const next = [...prev];
      for (const p of punches) {
        const i = next.findIndex((e) => e.workerId === p.workerId && e.date === p.date);
        if (i === -1) {
          next.push({
            id: uid(),
            workerId: p.workerId,
            date: p.date,
            timeIn: p.kind === "in" ? p.time : "",
            timeOut: p.kind === "out" ? p.time : "",
          });
        } else {
          const e = { ...next[i] };
          if (p.kind === "in") e.timeIn = e.timeIn ? (p.time < e.timeIn ? p.time : e.timeIn) : p.time;
          else e.timeOut = e.timeOut ? (p.time > e.timeOut ? p.time : e.timeOut) : p.time;
          next[i] = e;
        }
      }
      return next;
    });
    if (punches.length > 0) {
      setSelectedWeek(weekStart(punches[0].date));
      setTab("entries");
    }
  };

  const weeks = useMemo(() => {
    const set = new Set(entries.map((e) => weekStart(e.date)));
    set.add(weekStart(toISO(new Date())));
    set.add(selectedWeek);
    return Array.from(set).sort().reverse();
  }, [entries, selectedWeek]);

  const rows = useMemo(
    () => buildPayroll(workers, entries, selectedWeek),
    [workers, entries, selectedWeek]
  );

  const setDeduction = (key: string, patch: Partial<Deductions>) =>
    setDeductions((prev) => ({ ...prev, [key]: { ...(prev[key] ?? EMPTY_DEDUCTIONS), ...patch } }));

  const tabs: { id: Tab; label: string; icon: typeof Camera }[] = [
    { id: "timemarks", label: "Upload Timemarks", icon: Camera },
    { id: "entries", label: "Time Entries", icon: Clock },
    { id: "payroll", label: "Payroll", icon: Banknote },
  ];

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[#2e3d31] pb-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-[#ffd23f]">
            Timemark → Payroll
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
            AUTO PAYROLL <span className="text-[#4d6b52]">LEDGER</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#8fa08f]">
            Upload timemark photos → timestamps are read automatically → weekly payroll is computed
            with regular hours (Mon–Fri · 7AM–4PM) and overtime past 4PM.
          </p>
        </div>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition",
            showSettings
              ? "border-[#ffd23f] bg-[#ffd23f]/10 text-[#ffd23f]"
              : "border-[#2e3d31] text-[#b8d4bc] hover:bg-[#16211a]"
          )}
        >
          <Settings className="h-4 w-4" /> Workers &amp; Rates
        </button>
      </header>

      {showSettings && (
        <div className="mb-8">
          <WorkersPanel workers={workers} onChange={setWorkers} />
        </div>
      )}

      {/* Tabs */}
      <nav className="mb-6 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition",
              tab === t.id
                ? "bg-[#ffd23f] text-[#1a1a05]"
                : "bg-[#121a14] text-[#8fa08f] hover:bg-[#16211a] hover:text-[#b8d4bc]"
            )}
          >
            <t.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </nav>

      {tab === "timemarks" && <UploadZone workers={workers} onConfirm={addPunches} />}
      {tab === "entries" && (
        <EntriesTable workers={workers} entries={entries} onChange={setEntries} />
      )}
      {tab === "payroll" && (
        <PayrollTable
          rows={rows}
          wkStart={selectedWeek}
          weeks={weeks}
          onWeekChange={setSelectedWeek}
          deductions={deductions}
          onDeductionChange={setDeduction}
        />
      )}
    </div>
  );
}
