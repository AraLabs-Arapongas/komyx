import "server-only";

/** Dev-only helper to log slow awaits: `await timed("label", promise)`. */
export async function timed<T>(label: string, p: PromiseLike<T>): Promise<T> {
  if (process.env.NODE_ENV === "production") return p;
  const start = performance.now();
  try {
    return await p;
  } finally {
    const ms = Math.round(performance.now() - start);
    if (ms > 300) console.log(`[slow] ${label}: ${ms}ms`);
  }
}
