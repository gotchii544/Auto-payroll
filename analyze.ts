export type CheckStatus = "pass" | "warn" | "fail" | "info";

export interface ForensicCheck {
  id: string;
  title: string;
  status: CheckStatus;
  detail: string;
  weight: number; // penalty applied when warn/fail
}

export type Verdict = "authentic" | "suspicious" | "modified" | "nodata";

export interface AnalysisResult {
  verdict: Verdict;
  score: number; // 0-100 trust score
  checks: ForensicCheck[];
  timeline: { label: string; value: string; raw?: Date }[];
  metadata: Record<string, string>;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileLastModified: Date;
}

const EDITOR_SIGNATURES = [
  "photoshop", "gimp", "lightroom", "snapseed", "picsart", "canva",
  "affinity", "pixlr", "luminar", "capture one", "paint.net", "photopea",
  "facetune", "vsco", "polarr", "fotor", "befunky",
];

const AI_SIGNATURES = [
  "midjourney", "dall-e", "dall·e", "stable diffusion", "firefly",
  "imagen", "flux", "leonardo", "ideogram", "openai", "gpt-image", "grok",
];

function fmt(d: Date | undefined | null): string {
  if (!d || isNaN(d.getTime())) return "—";
  return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

function asDate(v: unknown): Date | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === "string") {
    // EXIF format "YYYY:MM:DD HH:MM:SS"
    const m = v.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    if (m) {
      const d = new Date(
        Number(m[1]), Number(m[2]) - 1, Number(m[3]),
        Number(m[4]), Number(m[5]), Number(m[6])
      );
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function analyzeExif(
  exif: Record<string, unknown> | null | undefined,
  file: { name: string; size: number; type: string; lastModified: number }
): AnalysisResult {
  const checks: ForensicCheck[] = [];
  const metadata: Record<string, string> = {};
  const fileLastModified = new Date(file.lastModified);

  const e = exif ?? {};

  const dateOriginal = asDate(e.DateTimeOriginal);
  const dateDigitized = asDate(e.CreateDate) ?? asDate(e.DateTimeDigitized);
  const dateModified = asDate(e.ModifyDate) ?? asDate(e.DateTime);
  const gpsDate = asDate(e.GPSDateStamp && e.GPSTimeStamp
    ? `${String(e.GPSDateStamp).replace(/:/g, "-")}T${formatGpsTime(e.GPSTimeStamp)}Z`
    : undefined);

  const make = str(e.Make);
  const model = str(e.Model);
  const software = str(e.Software) || str(e.CreatorTool) || str(e.ProcessingSoftware);
  const artist = str(e.Artist) || str(e.Creator);

  // Collect displayable metadata
  const fields: [string, unknown][] = [
    ["Camera Make", make], ["Camera Model", model], ["Lens", e.LensModel],
    ["Software", software], ["Artist", artist],
    ["Date Original", fmt(dateOriginal ?? undefined)],
    ["Date Digitized", fmt(dateDigitized ?? undefined)],
    ["Date Modified (EXIF)", fmt(dateModified ?? undefined)],
    ["Timezone Offset", e.OffsetTimeOriginal ?? e.OffsetTime],
    ["Exposure", e.ExposureTime ? `1/${Math.round(1 / Number(e.ExposureTime))}s` : undefined],
    ["Aperture", e.FNumber ? `f/${e.FNumber}` : undefined],
    ["ISO", e.ISO], ["Focal Length", e.FocalLength ? `${e.FocalLength}mm` : undefined],
    ["Flash", e.Flash], ["Orientation", e.Orientation],
    ["Width", e.ExifImageWidth ?? e.ImageWidth],
    ["Height", e.ExifImageHeight ?? e.ImageHeight],
    ["GPS Latitude", e.latitude != null ? Number(e.latitude).toFixed(6) : undefined],
    ["GPS Longitude", e.longitude != null ? Number(e.longitude).toFixed(6) : undefined],
    ["GPS Timestamp", fmt(gpsDate ?? undefined)],
    ["Color Space", e.ColorSpace],
  ];
  for (const [k, v] of fields) {
    if (v !== undefined && v !== null && String(v) !== "—" && String(v) !== "") {
      metadata[k] = String(v);
    }
  }

  const hasExif = Object.keys(e).length > 0;
  const hasAnyDate = !!(dateOriginal || dateDigitized || dateModified);
  let penalty = 0;

  // ── Check 1: EXIF presence ──
  if (!hasExif) {
    checks.push({
      id: "exif", title: "EXIF metadata present", status: "fail", weight: 40,
      detail: "No EXIF metadata found. The image was likely stripped (social media re-upload), screenshotted, or heavily processed. Its timestamp cannot be verified.",
    });
    penalty += 40;
  } else if (!hasAnyDate) {
    checks.push({
      id: "exif", title: "EXIF metadata present", status: "warn", weight: 30,
      detail: "Some metadata exists, but no capture timestamps were found. Date claims about this image cannot be corroborated.",
    });
    penalty += 30;
  } else {
    checks.push({
      id: "exif", title: "EXIF metadata present", status: "pass", weight: 0,
      detail: `Metadata block found with ${Object.keys(e).length} fields, including capture timestamps.`,
    });
  }

  // ── Check 2: Original vs Digitized consistency ──
  if (dateOriginal && dateDigitized) {
    const diff = Math.abs(dateOriginal.getTime() - dateDigitized.getTime());
    if (diff < 2000) {
      checks.push({
        id: "orig-digi", title: "Capture ↔ digitization match", status: "pass", weight: 0,
        detail: "DateTimeOriginal and CreateDate match — consistent with an unaltered in-camera file.",
      });
    } else {
      checks.push({
        id: "orig-digi", title: "Capture ↔ digitization match", status: "warn", weight: 15,
        detail: `DateTimeOriginal and CreateDate differ by ${humanDiff(diff)}. This can indicate scanning, re-encoding, or manual date editing.`,
      });
      penalty += 15;
    }
  }

  // ── Check 3: Modification after capture ──
  if (dateOriginal && dateModified) {
    const diff = dateModified.getTime() - dateOriginal.getTime();
    if (diff > 60_000) {
      checks.push({
        id: "modified", title: "Modified after capture", status: "warn", weight: 20,
        detail: `EXIF ModifyDate is ${humanDiff(diff)} AFTER the capture time — the file was re-saved or edited after being taken.`,
      });
      penalty += 20;
    } else if (diff < -60_000) {
      checks.push({
        id: "modified", title: "Modified after capture", status: "fail", weight: 30,
        detail: `EXIF ModifyDate is BEFORE the capture time by ${humanDiff(-diff)} — physically impossible for an untouched file. Strong sign of timestamp tampering.`,
      });
      penalty += 30;
    } else {
      checks.push({
        id: "modified", title: "Modified after capture", status: "pass", weight: 0,
        detail: "ModifyDate matches capture time — no post-capture re-save detected in EXIF.",
      });
    }
  }

  // ── Check 4: Editing software fingerprint ──
  if (software) {
    const sw = software.toLowerCase();
    const ai = AI_SIGNATURES.find((s) => sw.includes(s));
    const editor = EDITOR_SIGNATURES.find((s) => sw.includes(s));
    if (ai) {
      checks.push({
        id: "software", title: "Software fingerprint", status: "fail", weight: 45,
        detail: `Software tag "${software}" matches a known AI image generator (${ai}). This image is likely synthetic.`,
      });
      penalty += 45;
    } else if (editor) {
      checks.push({
        id: "software", title: "Software fingerprint", status: "warn", weight: 25,
        detail: `Software tag "${software}" is a known photo editor (${editor}). The image — and possibly its timestamp — was processed after capture.`,
      });
      penalty += 25;
    } else {
      checks.push({
        id: "software", title: "Software fingerprint", status: "pass", weight: 0,
        detail: `Software tag "${software}" looks like camera/phone firmware, not an editor.`,
      });
    }
  } else if (hasExif) {
    checks.push({
      id: "software", title: "Software fingerprint", status: "info", weight: 0,
      detail: "No software tag present — no editor fingerprint detected.",
    });
  }

  // ── Check 5: GPS time cross-reference ──
  if (gpsDate && dateOriginal) {
    const diff = Math.abs(gpsDate.getTime() - dateOriginal.getTime());
    // GPS is UTC; local EXIF time may be offset by timezone — allow up to 14h + 5min slack
    const tzSlack = 14 * 3600_000 + 5 * 60_000;
    if (diff <= tzSlack && diff % 3600_000 < 10 * 60_000 || diff < 5 * 60_000) {
      checks.push({
        id: "gps", title: "GPS clock cross-check", status: "pass", weight: 0,
        detail: `Satellite GPS timestamp (${fmt(gpsDate)}) is consistent with the EXIF capture time within timezone bounds. GPS time comes from satellites and is very hard to fake.`,
      });
    } else if (diff > tzSlack) {
      checks.push({
        id: "gps", title: "GPS clock cross-check", status: "fail", weight: 35,
        detail: `Satellite GPS timestamp (${fmt(gpsDate)}) differs from EXIF capture time by ${humanDiff(diff)} — beyond any timezone offset. The EXIF date was likely altered while the GPS record was forgotten.`,
      });
      penalty += 35;
    } else {
      checks.push({
        id: "gps", title: "GPS clock cross-check", status: "warn", weight: 10,
        detail: `GPS timestamp differs from EXIF time by ${humanDiff(diff)}. Could be a timezone quirk, or minor clock drift.`,
      });
      penalty += 10;
    }
  } else if (hasAnyDate) {
    checks.push({
      id: "gps", title: "GPS clock cross-check", status: "info", weight: 0,
      detail: "No GPS timestamp embedded — satellite cross-verification unavailable.",
    });
  }

  // ── Check 6: Plausibility of the date ──
  if (dateOriginal) {
    const now = Date.now();
    if (dateOriginal.getTime() > now + 24 * 3600_000) {
      checks.push({
        id: "plausible", title: "Date plausibility", status: "fail", weight: 40,
        detail: `Capture date ${fmt(dateOriginal)} is in the FUTURE. The camera clock was wrong or the timestamp was forged.`,
      });
      penalty += 40;
    } else if (dateOriginal.getFullYear() < 1995) {
      checks.push({
        id: "plausible", title: "Date plausibility", status: "warn", weight: 20,
        detail: `Capture date ${fmt(dateOriginal)} predates consumer digital cameras — likely a reset or manipulated clock.`,
      });
      penalty += 20;
    } else {
      checks.push({
        id: "plausible", title: "Date plausibility", status: "pass", weight: 0,
        detail: `Capture date ${fmt(dateOriginal)} is within a plausible range.`,
      });
    }
  }

  // ── Check 7: Camera identity ──
  if (hasExif) {
    if (make || model) {
      checks.push({
        id: "camera", title: "Camera identity", status: "pass", weight: 0,
        detail: `Device recorded: ${[make, model].filter(Boolean).join(" ")}. Timestamps carry more weight when tied to a real device.`,
      });
    } else if (hasAnyDate) {
      checks.push({
        id: "camera", title: "Camera identity", status: "warn", weight: 15,
        detail: "Timestamps exist but no camera make/model — typical of edited exports, screenshots, or synthetic images.",
      });
      penalty += 15;
    }
  }

  // ── Check 8: Suspicious round timestamp ──
  if (dateOriginal) {
    const s = dateOriginal.getSeconds(), m = dateOriginal.getMinutes(), h = dateOriginal.getHours();
    if (s === 0 && m === 0 && (h === 0 || h === 12)) {
      checks.push({
        id: "round", title: "Timestamp precision", status: "warn", weight: 10,
        detail: `Capture time is exactly ${h.toString().padStart(2, "0")}:00:00 — perfectly round timestamps are statistically rare in real photos and common in manual edits.`,
      });
      penalty += 10;
    } else {
      checks.push({
        id: "round", title: "Timestamp precision", status: "pass", weight: 0,
        detail: "Timestamp has natural second-level precision.",
      });
    }
  }

  // ── Score & verdict ──
  let verdict: Verdict;
  let score: number;
  if (!hasExif || !hasAnyDate) {
    verdict = "nodata";
    score = 0;
  } else {
    score = Math.max(0, Math.min(100, 100 - penalty));
    verdict = score >= 80 ? "authentic" : score >= 50 ? "suspicious" : "modified";
  }

  const timeline: AnalysisResult["timeline"] = [];
  if (dateOriginal) timeline.push({ label: "Captured (EXIF Original)", value: fmt(dateOriginal), raw: dateOriginal });
  if (dateDigitized) timeline.push({ label: "Digitized (EXIF Create)", value: fmt(dateDigitized), raw: dateDigitized });
  if (gpsDate) timeline.push({ label: "GPS Satellite Time", value: fmt(gpsDate), raw: gpsDate });
  if (dateModified) timeline.push({ label: "Last EXIF Modify", value: fmt(dateModified), raw: dateModified });
  timeline.push({ label: "File System Modified", value: fmt(fileLastModified), raw: fileLastModified });
  timeline.sort((a, b) => (a.raw?.getTime() ?? 0) - (b.raw?.getTime() ?? 0));

  return {
    verdict, score, checks, timeline, metadata,
    fileName: file.name, fileSize: file.size,
    fileType: file.type || "unknown", fileLastModified,
  };
}

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function formatGpsTime(v: unknown): string {
  if (Array.isArray(v)) {
    const [h, m, s] = v.map(Number);
    return `${pad(h)}:${pad(m)}:${pad(Math.floor(s || 0))}`;
  }
  return String(v ?? "00:00:00");
}

function pad(n: number): string {
  return String(isNaN(n) ? 0 : n).padStart(2, "0");
}

function humanDiff(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  if (s < 86400) return `${(s / 3600).toFixed(1)} hours`;
  if (s < 86400 * 365) return `${(s / 86400).toFixed(1)} days`;
  return `${(s / (86400 * 365)).toFixed(1)} years`;
}
