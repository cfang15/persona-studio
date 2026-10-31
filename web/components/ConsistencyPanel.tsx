"use client";

import { useEffect, useState } from "react";
import { api, type ConsistencyRun, type Persona } from "@/lib/api";

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function ConsistencyPanel({ persona }: { persona: Persona }) {
  const [runs, setRuns] = useState<ConsistencyRun[]>([]);
  const [probe, setProbe] = useState("Who are you, and what do you want?");
  const [samples, setSamples] = useState(5);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    api.listRuns(persona.id).then(setRuns).catch((e) => setError(e.message));
  }, [persona.id]);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setRunning(true);
    setError(null);
    try {
      const result = await api.runConsistency(persona.id, probe.trim(), samples);
      setRuns((r) => [result, ...r]);
      setOpenId(result.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <section aria-labelledby="check-heading" className="rounded-lg border border-line bg-sheet p-4">
      <h2 id="check-heading" className="font-display text-xl font-bold">Stay-in-character check</h2>
      <p className="mt-1 text-sm text-muted">
        Ask the same question several times. The score combines how alike the answers are (70%) and how many traits show up (30%).
      </p>

      <form onSubmit={run} className="mt-4 space-y-3">
        <label className="block">
          <span className="text-sm font-bold">Question</span>
          <input required value={probe} onChange={(e) => setProbe(e.target.value)} maxLength={1000} className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm font-bold">Times to ask: {samples}</span>
          <input type="range" min={2} max={10} value={samples} onChange={(e) => setSamples(Number(e.target.value))} className="mt-1 w-full accent-voice" />
        </label>
        <button type="submit" disabled={running} className="w-full rounded-md bg-ink px-4 py-2 font-bold text-sheet disabled:opacity-60">
          {running ? `Asking ${samples} times…` : "Run check"}
        </button>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </form>

      <ol className="mt-5 divide-y divide-line border-t border-line">
        {runs.length === 0 && <li className="py-3 text-sm text-muted">No checks yet.</li>}
        {runs.map((r) => (
          <li key={r.id} className="py-3">
            <button
              onClick={() => setOpenId(openId === r.id ? null : r.id)}
              aria-expanded={openId === r.id}
              className="flex w-full items-baseline gap-3 text-left"
            >
              <span className="font-display text-3xl font-bold tabular-nums text-brass">{Math.round(r.score)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{r.probe}</span>
                <span className="text-xs text-muted">
                  answers alike {pct(r.agreement)}, traits shown {pct(r.traitCoverage)}
                </span>
              </span>
            </button>
            {openId === r.id && (
              <ol className="mt-3 list-decimal space-y-2 pl-6 text-sm">
                {r.responses.map((resp, i) => (
                  <li key={i} className="leading-relaxed">{resp}</li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
