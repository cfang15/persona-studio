/**
 * Forwards /api/* to the backend API, so the browser only ever talks to this site.
 * API_URL is read at request time, so one Docker image works in any environment.
 * Render passes it as "host:port", so a missing scheme defaults to http.
 */
const raw = process.env.API_URL ?? "http://localhost:4000";
const API_URL = /^https?:\/\//.test(raw) ? raw : `http://${raw}`;

type Ctx = { params: Promise<{ path: string[] }> };

async function forward(req: Request, { params }: Ctx): Promise<Response> {
  const { path } = await params;
  const target = `${API_URL}/${path.map(encodeURIComponent).join("/")}`;
  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: hasBody ? await req.text() : undefined,
      signal: AbortSignal.timeout(90_000),
      cache: "no-store",
    });
  } catch {
    return Response.json(
      { error: "The API isn't responding. If the site was idle, it may be waking up; try again in a minute." },
      { status: 503 },
    );
  }

  if (upstream.status === 204) return new Response(null, { status: 204 });
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
  });
}

export const dynamic = "force-dynamic";
export { forward as GET, forward as POST, forward as PUT, forward as DELETE };
