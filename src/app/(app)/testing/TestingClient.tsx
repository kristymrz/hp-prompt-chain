"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepStatus = "idle" | "loading" | "success" | "error";

type StepState = {
  status: StepStatus;
  result: string | null; // JSON-stringified result or error message
};

type CaptionRecord = {
  id?: string;
  content?: string | null;
  [key: string]: unknown;
};

type HistoryEntry = {
  id: string;
  timestamp: string;
  fileName: string;
  humorFlavorId: string | null;
  imageObjectUrl: string; // blob URL, only valid current session
  cdnUrl: string;         // persisted S3 URL, survives refresh
  captions: CaptionRecord[];
};

type LastResult = {
  imageObjectUrl: string;
  captions: CaptionRecord[];
};

const BASE_URL = "https://api.almostcrackd.ai";
const SUPPORTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/heic"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const INITIAL_STEPS: StepState[] = [
  { status: "idle", result: null },
  { status: "idle", result: null },
  { status: "idle", result: null },
  { status: "idle", result: null },
];

const STEP_LABELS = [
  "Generate presigned URL",
  "Upload image to S3",
  "Register image URL",
  "Generate captions",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function TestingClient() {
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [humorFlavorId, setHumorFlavorId] = useState("");
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<StepState[]>(INITIAL_STEPS);
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyModal, setHistoryModal] = useState<HistoryEntry | null>(null);

  // Load history from localStorage after mount (avoids SSR/client mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("testing-history");
      if (stored) setHistory(JSON.parse(stored) as HistoryEntry[]);
    } catch {
      // ignore
    }
  }, []);

  // Persist history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("testing-history", JSON.stringify(history));
    } catch {
      // localStorage full or unavailable — fail silently
    }
  }, [history]);

  function setStep(idx: number, update: Partial<StepState>) {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...update } : s)));
  }

  function resetSteps() {
    setSteps(INITIAL_STEPS);
  }

  async function getToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function handleRun() {
    if (!file) return;
    resetSteps();
    setLastResult(null);
    setRunning(true);
    const imageObjectUrl = URL.createObjectURL(file);

    const token = await getToken();
    if (!token) {
      setStep(0, { status: "error", result: "Not authenticated — no session token found." });
      setRunning(false);
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // ── Step 1: Generate presigned URL ──────────────────────────────────────
    setStep(0, { status: "loading", result: null });
    let presignedUrl: string;
    let cdnUrl: string;
    try {
      const res = await fetch(`${BASE_URL}/pipeline/generate-presigned-url`, {
        method: "POST",
        headers,
        body: JSON.stringify({ contentType: file.type }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      presignedUrl = data.presignedUrl;
      cdnUrl = data.cdnUrl;
      setStep(0, { status: "success", result: JSON.stringify({ presignedUrl, cdnUrl }, null, 2) });
    } catch (e) {
      setStep(0, { status: "error", result: String(e) });
      setRunning(false);
      return;
    }

    // ── Step 2: Upload image bytes ───────────────────────────────────────────
    setStep(1, { status: "loading", result: null });
    try {
      const res = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      setStep(1, { status: "success", result: `Upload complete. CDN URL:\n${cdnUrl}` });
    } catch (e) {
      setStep(1, { status: "error", result: String(e) });
      setRunning(false);
      return;
    }

    // ── Step 3: Register image URL ───────────────────────────────────────────
    setStep(2, { status: "loading", result: null });
    let imageId: string;
    try {
      const res = await fetch(`${BASE_URL}/pipeline/upload-image-from-url`, {
        method: "POST",
        headers,
        body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      imageId = data.imageId;
      setStep(2, { status: "success", result: JSON.stringify(data, null, 2) });
    } catch (e) {
      setStep(2, { status: "error", result: String(e) });
      setRunning(false);
      return;
    }

    // ── Step 4: Generate captions ────────────────────────────────────────────
    setStep(3, { status: "loading", result: null });
    let captions: unknown[] = [];
    try {
      const body: Record<string, unknown> = { imageId };
      if (humorFlavorId.trim()) body.humorFlavorId = Number(humorFlavorId.trim());
      const res = await fetch(`${BASE_URL}/pipeline/generate-captions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      captions = await res.json();
      setStep(3, { status: "success", result: JSON.stringify(captions, null, 2) });
    } catch (e) {
      setStep(3, { status: "error", result: String(e) });
      setRunning(false);
      return;
    }

    const typedCaptions = captions as CaptionRecord[];

    // ── Show inline result ───────────────────────────────────────────────────
    setLastResult({ imageObjectUrl, captions: typedCaptions });

    // ── Add to session history ───────────────────────────────────────────────
    setHistory((prev) => [
      {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        fileName: file.name,
        humorFlavorId: humorFlavorId.trim() || null,
        imageObjectUrl,
        cdnUrl,
        captions: typedCaptions,
      },
      ...prev,
    ]);

    setRunning(false);
  }

  const stepIndicatorClass = (status: StepStatus) => {
    if (status === "idle") return "bg-grey-200 text-grey-500 dark:bg-dsg-700 dark:text-grey-400";
    if (status === "loading") return "bg-teal-100 text-teal-700 dark:bg-teal-700/30 dark:text-teal-300 animate-pulse";
    if (status === "success") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  };

  const stepLabel = (status: StepStatus) => {
    if (status === "idle") return "Waiting";
    if (status === "loading") return "Running…";
    if (status === "success") return "Done";
    return "Error";
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-dsg-900 dark:text-dsg-50">Humor Flavor Testing</h2>
        <p className="mt-1 text-sm text-grey-500 dark:text-grey-400">
          Run the caption pipeline against a test image using a specific humor flavor
        </p>
      </div>

      {/* Input form */}
      <div className="mb-8 rounded-xl border border-grey-200 bg-white p-6 shadow-sm dark:border-dsg-700 dark:bg-dsg-900">
        <div className="space-y-4">
          {/* Image upload */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dsg-700 dark:text-dsg-300">
              Image <span className="text-red-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept={SUPPORTED_TYPES.join(",")}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-dsg-800 file:mr-4 file:rounded-lg file:border-0 file:bg-dsg-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-dsg-700 hover:file:bg-dsg-200 dark:text-dsg-200 dark:file:bg-dsg-800 dark:file:text-dsg-300"
            />
            <p className="mt-1 text-xs text-grey-400 dark:text-grey-500">
              Supported file types: .png, .jpeg, .jpg, .webp, .gif, .heic
            </p>
          </div>

          {/* Humor Flavor ID */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dsg-700 dark:text-dsg-300">
              Humor Flavor ID{" "}
              <span className="font-normal text-grey-400 dark:text-grey-500">(optional)</span>
            </label>
            <input
              type="number"
              value={humorFlavorId}
              onChange={(e) => setHumorFlavorId(e.target.value)}
              placeholder="e.g. 145"
              className="w-full rounded-lg border border-grey-200 bg-white px-3 py-2 text-sm text-dsg-900 placeholder-grey-400 focus:border-dsg-500 focus:outline-none dark:border-dsg-700 dark:bg-dsg-950 dark:text-dsg-50"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleRun}
            disabled={!file || running}
            className="rounded-lg bg-dsg-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-dsg-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-dsg-50 dark:text-dsg-900 dark:hover:bg-dsg-200"
          >
            {running ? "Running…" : "Run Pipeline"}
          </button>
        </div>
      </div>

      {/* Pipeline steps */}
      <div className="mb-10 space-y-3">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-grey-200 bg-white dark:border-dsg-700 dark:bg-dsg-900"
          >
            {/* Step header */}
            <div className="flex items-center gap-3 px-5 py-3">
              <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${stepIndicatorClass(step.status)}`}>
                {idx + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-dsg-800 dark:text-dsg-200">
                {STEP_LABELS[idx]}
              </span>
              <span className={`text-xs font-medium ${
                step.status === "success" ? "text-green-600 dark:text-green-400" :
                step.status === "error" ? "text-red-600 dark:text-red-400" :
                step.status === "loading" ? "text-teal-600 dark:text-teal-400" :
                "text-grey-400 dark:text-grey-500"
              }`}>
                {stepLabel(step.status)}
              </span>
            </div>

            {/* Step result */}
            {step.result && (
              <div className="border-t border-grey-100 px-5 py-3 dark:border-dsg-800">
                <pre className="whitespace-pre-wrap break-words text-xs text-dsg-700 dark:text-dsg-300">
                  {step.result}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Inline result: image + captions */}
      {lastResult && (
        <div className="mb-10 rounded-xl border border-grey-200 bg-white p-6 shadow-sm dark:border-dsg-700 dark:bg-dsg-900">
          <h3 className="mb-4 text-base font-semibold text-dsg-900 dark:text-dsg-50">Results</h3>
          <div className="flex flex-col gap-6 sm:flex-row">
            {/* Image */}
            <div className="flex-shrink-0">
              <img
                src={lastResult.imageObjectUrl}
                alt="Uploaded"
                className="max-h-64 w-full rounded-lg object-contain bg-grey-50 sm:w-56 dark:bg-dsg-950"
              />
            </div>
            {/* Captions */}
            <div className="flex-1">
              {lastResult.captions.length === 0 ? (
                <p className="italic text-sm text-grey-400 dark:text-grey-500">No captions returned.</p>
              ) : (
                <ol className="space-y-2">
                  {lastResult.captions.map((c, i) => (
                    <li key={c.id ?? i} className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-700/30 dark:text-teal-300">
                        {i + 1}
                      </span>
                      <span className="text-sm text-dsg-800 dark:text-dsg-200">
                        {c.content ?? <span className="italic text-grey-400 dark:text-grey-500">No content</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Session history */}
      {history.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold text-dsg-900 dark:text-dsg-50">
            Session History
          </h3>
          <div className="overflow-hidden rounded-xl border border-grey-200 dark:border-dsg-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-grey-200 bg-grey-50 dark:border-dsg-800 dark:bg-dsg-900">
                  <th className="px-4 py-3 text-left font-medium text-grey-600 dark:text-grey-400">Time</th>
                  <th className="px-4 py-3 text-left font-medium text-grey-600 dark:text-grey-400">File</th>
                  <th className="px-4 py-3 text-left font-medium text-grey-600 dark:text-grey-400">Flavor ID</th>
                  <th className="px-4 py-3 text-left font-medium text-grey-600 dark:text-grey-400">Captions</th>
                  <th className="px-4 py-3 text-right font-medium text-grey-600 dark:text-grey-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-grey-100 dark:divide-dsg-800">
                {history.map((entry) => (
                  <tr
                    key={entry.id}
                    className="bg-white transition-colors hover:bg-grey-50 dark:bg-dsg-950 dark:hover:bg-dsg-900"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-grey-500 dark:text-grey-400">
                      {formatDate(entry.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-dsg-800 dark:text-dsg-200">{entry.fileName}</td>
                    <td className="px-4 py-3 text-grey-600 dark:text-grey-400">
                      {entry.humorFlavorId ?? <span className="italic text-grey-400 dark:text-grey-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-grey-600 dark:text-grey-400">
                      {Array.isArray(entry.captions) ? entry.captions.length : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setHistoryModal(entry)}
                        className="rounded-lg border border-grey-200 px-3 py-1.5 text-xs font-medium text-dsg-700 transition hover:border-dsg-400 hover:text-dsg-900 dark:border-dsg-700 dark:text-dsg-300 dark:hover:border-dsg-500 dark:hover:text-dsg-50"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History detail modal */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-dsg-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-dsg-900 dark:text-dsg-50">Caption Results</h3>
              <button
                onClick={() => setHistoryModal(null)}
                className="rounded-lg p-1.5 text-grey-400 transition hover:bg-grey-100 hover:text-dsg-900 dark:hover:bg-dsg-800 dark:hover:text-dsg-50"
              >
                ✕
              </button>
            </div>
            <div className="mb-4 flex gap-4 text-sm text-grey-500 dark:text-grey-400">
              <span>{formatDate(historyModal.timestamp)}</span>
              <span>{historyModal.fileName}</span>
              {historyModal.humorFlavorId && <span>Flavor ID: {historyModal.humorFlavorId}</span>}
            </div>

            {/* Image + captions */}
            <div className="mb-5 flex flex-col gap-4 sm:flex-row">
              <img
                src={historyModal.cdnUrl || historyModal.imageObjectUrl}
                alt="Uploaded"
                className="max-h-48 w-full rounded-lg object-contain bg-grey-50 sm:w-44 dark:bg-dsg-950"
              />
              <div className="flex-1">
                {historyModal.captions.length === 0 ? (
                  <p className="italic text-sm text-grey-400 dark:text-grey-500">No captions returned.</p>
                ) : (
                  <ol className="space-y-2">
                    {historyModal.captions.map((c, i) => (
                      <li key={c.id ?? i} className="flex gap-3">
                        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-700/30 dark:text-teal-300">
                          {i + 1}
                        </span>
                        <span className="text-sm text-dsg-800 dark:text-dsg-200">
                          {c.content ?? <span className="italic text-grey-400">No content</span>}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            <details className="rounded-lg border border-grey-100 dark:border-dsg-800">
              <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-grey-500 dark:text-grey-400 hover:text-dsg-800 dark:hover:text-dsg-200">
                Raw JSON
              </summary>
              <pre className="whitespace-pre-wrap px-4 pb-4 pt-2 text-xs text-dsg-800 dark:text-dsg-200">
                {JSON.stringify(historyModal.captions, null, 2)}
              </pre>
            </details>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setHistoryModal(null)}
                className="rounded-lg border border-grey-200 px-4 py-2 text-sm font-medium text-dsg-700 transition hover:border-grey-400 dark:border-dsg-700 dark:text-dsg-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
