"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Upload, Loader2, Check, X, AlertTriangle } from "lucide-react";
import { Worker, uid, toISO } from "@/lib/payroll";
import { ocrImage, parseTimestamp } from "@/lib/ocr";
import { cn } from "@/lib/utils";

export interface ConfirmedPunch {
  workerId: string;
  date: string;
  time: string;
  kind: "in" | "out";
}

interface Punch {
  id: string;
  fileName: string;
  url: string;
  status: "ocr" | "ready" | "failed";
  date: string;
  time: string;
  workerId: string;
  kind: "in" | "out";
  rawText: string;
}

interface UploadZoneProps {
  workers: Worker[];
  onConfirm: (punches: ConfirmedPunch[]) => void;
}

export function UploadZone({ workers, onConfirm }: UploadZoneProps) {
  const [punches, setPunches] = useState<Punch[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: File[]) => {
      const imgs = files.filter((f) => f.type.startsWith("image/"));
      if (imgs.length === 0) return;
      const fresh: Punch[] = imgs.map((f) => ({
        id: uid(),
        fileName: f.name,
        url: URL.createObjectURL(f),
        status: "ocr",
        date: "",
        time: "",
        workerId: workers[0]?.id ?? "",
        kind: "in",
        rawText: "",
      }));
      setPunches((prev) => [...prev, ...fresh]);

      for (let i = 0; i < imgs.length; i++) {
        const p = fresh[i];
        try {
          const text = await ocrImage(imgs[i]);
          const parsed = parseTimestamp(text);
          const hour = parsed.time ? parseInt(parsed.time.split(":")[0], 10) : 0;
          setPunches((prev) =>
            prev.map((x) =>
              x.id === p.id
                ? {
                    ...x,
                    status: "ready",
                    date: parsed.date ?? toISO(new Date()),
                    time: parsed.time ?? "",
                    kind: parsed.time && hour >= 12 ? "out" : "in",
                    rawText: parsed.raw.slice(0, 120),
                  }
                : x
            )
          );
        } catch {
          setPunches((prev) =>
            prev.map((x) =>
              x.id === p.id ? { ...x, status: "failed", date: toISO(new Date()) } : x
            )
          );
        }
      }
    },
    [workers]
  );

  const update = (id: string, patch: Partial<Punch>) =>
    setPunches((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const remove = (id: string) => setPunches((prev) => prev.filter((p) => p.id !== id));

  const readyPunches = punches.filter((p) => p.status !== "ocr" && p.date && p.time && p.workerId);
  const busy = punches.some((p) => p.status === "ocr");

  const confirmAll = () => {
    onConfirm(
      readyPunches.map((p) => ({ workerId: p.workerId, date: p.date, time: p.time, kind: p.kind }))
    );
    setPunches([]);
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          processFiles(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "w-full rounded-xl border-2 border-dashed p-10 text-center transition-all",
          dragOver
            ? "border-[#ffd23f] bg-[#ffd23f]/10 scale-[1.01]"
            : "border-[#2e3d31] bg-[#121a14] hover:border-[#4d6b52] hover:bg-[#16211a]"
        )}
      >
        <Upload className="mx-auto h-10 w-10 text-[#ffd23f]" />
        <p className="mt-3 text-lg font-semibold tracking-wide">Drop timemark images here</p>
        <p className="mt-1 text-sm text-[#8fa08f]">
          or click to browse — the timestamp on each photo is read automatically
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            processFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </button>

      {/* Pending punches */}
      {punches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#8fa08f]">
              Detected punches — review &amp; confirm
            </h3>
            <button
              onClick={confirmAll}
              disabled={busy || readyPunches.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-[#ffd23f] px-4 py-2 text-sm font-bold text-[#1a1a05] transition hover:bg-[#ffdd6b] disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Add {readyPunches.length} to time entries
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {punches.map((p) => (
              <div
                key={p.id}
                className="flex gap-3 rounded-xl border border-[#2e3d31] bg-[#121a14] p-3"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-[#2e3d31] bg-black">
                  <Image src={p.url} alt={p.fileName} fill unoptimized className="object-cover" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-[#8fa08f]">{p.fileName}</p>
                    <button onClick={() => remove(p.id)} className="text-[#8fa08f] hover:text-red-400">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {p.status === "ocr" ? (
                    <div className="flex items-center gap-2 text-sm text-[#ffd23f]">
                      <Loader2 className="h-4 w-4 animate-spin" /> Reading timemark…
                    </div>
                  ) : (
                    <>
                      {p.status === "failed" && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5" /> Couldn&apos;t read — enter manually
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={p.date}
                          onChange={(e) => update(p.id, { date: e.target.value })}
                          className="rounded-md border border-[#2e3d31] bg-[#0d120e] px-2 py-1 text-xs [font-family:var(--font-plex)]"
                        />
                        <input
                          type="time"
                          value={p.time}
                          onChange={(e) => update(p.id, { time: e.target.value })}
                          className="rounded-md border border-[#2e3d31] bg-[#0d120e] px-2 py-1 text-xs [font-family:var(--font-plex)]"
                        />
                        <select
                          value={p.workerId}
                          onChange={(e) => update(p.id, { workerId: e.target.value })}
                          className="rounded-md border border-[#2e3d31] bg-[#0d120e] px-2 py-1 text-xs"
                        >
                          {workers.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={p.kind}
                          onChange={(e) => update(p.id, { kind: e.target.value as "in" | "out" })}
                          className="rounded-md border border-[#2e3d31] bg-[#0d120e] px-2 py-1 text-xs"
                        >
                          <option value="in">TIME IN</option>
                          <option value="out">TIME OUT</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
