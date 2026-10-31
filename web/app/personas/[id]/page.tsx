"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Chat } from "@/components/Chat";
import { ConsistencyPanel } from "@/components/ConsistencyPanel";
import { PersonaForm } from "@/components/PersonaForm";
import { api, type Persona } from "@/lib/api";

export default function PersonaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    api.getPersona(Number(id)).then(setPersona).catch((e) => setError(e.message));
  }, [id]);

  async function remove() {
    if (!persona || !confirm(`Delete ${persona.name} and all their chats?`)) return;
    await api.deletePersona(persona.id);
    router.push("/");
  }

  if (error) {
    return (
      <div>
        <p role="alert" className="text-danger">{error}</p>
        <Link href="/" className="mt-4 inline-block underline">Back to your cast</Link>
      </div>
    );
  }
  if (!persona) return <p className="text-muted">Loading character…</p>;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-muted underline-offset-4 hover:underline">Your cast</Link>
        {editing ? (
          <div className="mt-4 max-w-xl rounded-lg border border-line bg-sheet p-5">
            <PersonaForm
              initial={persona}
              submitLabel="Save changes"
              onCancel={() => setEditing(false)}
              onSubmit={async (input) => {
                setPersona(await api.updatePersona(persona.id, input));
                setEditing(false);
              }}
            />
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-start gap-x-6 gap-y-3">
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-5xl font-bold tracking-tight">{persona.name}</h1>
              {persona.traits.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {persona.traits.map((t) => (
                    <li key={t} className="rounded-full bg-voice-soft px-3 py-0.5 text-sm text-voice">{t}</li>
                  ))}
                </ul>
              )}
              {persona.speakingStyle && <p className="mt-3 max-w-prose italic text-muted">{persona.speakingStyle}</p>}
              {persona.backstory && <p className="mt-2 max-w-prose">{persona.backstory}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(true)} className="rounded-md border border-line px-3 py-1.5 text-sm">Edit</button>
              <button onClick={remove} className="rounded-md border border-line px-3 py-1.5 text-sm text-danger">Delete</button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Chat persona={persona} />
        <ConsistencyPanel persona={persona} />
      </div>
    </div>
  );
}
