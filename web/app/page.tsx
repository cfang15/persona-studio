"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PersonaForm } from "@/components/PersonaForm";
import { api, type Persona } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listPersonas().then(setPersonas).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
      <section aria-labelledby="cast">
        <h1 id="cast" className="font-display text-4xl font-bold tracking-tight">Your cast</h1>
        <p className="mt-2 max-w-prose text-muted">
          Each character has traits, a way of talking and a backstory. Open one to chat with it or test how well it stays in character.
        </p>

        {error && <p role="alert" className="mt-6 text-danger">{error}</p>}
        {!personas && !error && <p className="mt-6 text-muted">Loading characters…</p>}
        {personas?.length === 0 && (
          <p className="mt-6 rounded-md border border-dashed border-line p-6 text-muted">
            No characters yet. Write your first one with the form.
          </p>
        )}

        <ul className="mt-6 divide-y divide-line border-y border-line">
          {personas?.map((p) => (
            <li key={p.id}>
              <Link href={`/personas/${p.id}`} className="block py-4 hover:bg-sheet sm:px-2">
                <span className="font-display text-xl font-bold">{p.name}</span>
                {p.traits.length > 0 && <span className="ml-3 text-voice">{p.traits.join(", ")}</span>}
                {p.backstory && <p className="mt-1 line-clamp-2 max-w-prose text-sm text-muted">{p.backstory}</p>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="new" className="h-fit rounded-lg border border-line bg-sheet p-5">
        <h2 id="new" className="font-display text-2xl font-bold">New character</h2>
        <div className="mt-4">
          <PersonaForm
            submitLabel="Create character"
            onSubmit={async (input) => {
              const created = await api.createPersona(input);
              router.push(`/personas/${created.id}`);
            }}
          />
        </div>
      </section>
    </div>
  );
}
