"use client";

import { useState } from "react";
import type { PersonaInput } from "@/lib/api";

const empty: PersonaInput = { name: "", traits: [], speakingStyle: "", backstory: "" };

interface Props {
  initial?: PersonaInput;
  submitLabel: string;
  onSubmit: (p: PersonaInput) => Promise<void>;
  onCancel?: () => void;
}

export function PersonaForm({ initial = empty, submitLabel, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial.name);
  const [traits, setTraits] = useState(initial.traits.join(", "));
  const [speakingStyle, setSpeakingStyle] = useState(initial.speakingStyle);
  const [backstory, setBackstory] = useState(initial.backstory);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        traits: traits
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        speakingStyle,
        backstory,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const field = "mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-ink placeholder:text-muted/70";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-bold">Name</span>
        <input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Grumble" className={field} />
      </label>
      <label className="block">
        <span className="text-sm font-bold">Traits</span>
        <span className="ml-2 text-sm text-muted">separate with commas</span>
        <input value={traits} onChange={(e) => setTraits(e.target.value)} placeholder="grumpy, loyal, superstitious" className={field} />
      </label>
      <label className="block">
        <span className="text-sm font-bold">How they talk</span>
        <input maxLength={400} value={speakingStyle} onChange={(e) => setSpeakingStyle(e.target.value)} placeholder="Short sentences. Sighs a lot." className={field} />
      </label>
      <label className="block">
        <span className="text-sm font-bold">Backstory</span>
        <textarea maxLength={2000} rows={4} value={backstory} onChange={(e) => setBackstory(e.target.value)} placeholder="A blacksmith who lost his forge in the flood and blames the river spirits." className={field} />
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="rounded-md bg-ink px-4 py-2 font-bold text-sheet disabled:opacity-60">
          {saving ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md border border-line px-4 py-2">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
