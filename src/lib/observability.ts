import "server-only";

type ObservedJsonOptions = {
  route: string;
  status?: number;
  budgetBytes: number;
  headers?: HeadersInit;
};

export function observedJson(data: unknown, options: ObservedJsonOptions) {
  const startedAt = performance.now();
  const body = JSON.stringify(data);
  const bytes = Buffer.byteLength(body, "utf8");
  const serializationMs = Math.round((performance.now() - startedAt) * 10) / 10;
  const metric = { route: options.route, status: options.status ?? 200, bytes, budgetBytes: options.budgetBytes, serializationMs };
  if (bytes > options.budgetBytes) console.warn("api_response_budget_exceeded", metric);
  else console.info("api_response_metrics", metric);
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Content-Length", String(bytes));
  headers.set("Server-Timing", `serialize;dur=${serializationMs}`);
  return new Response(body, { status: options.status ?? 200, headers });
}
