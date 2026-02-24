export function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function requireHeader(request: Request, name: string): string {
  const value = request.headers.get(name);
  if (!value) {
    throw new Error(`Missing required header: ${name}`);
  }
  return value;
}
