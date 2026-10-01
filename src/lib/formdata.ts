export function objectFromForm(fd: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (v === "") continue;
    if (k in obj) {
      obj[k] = Array.isArray(obj[k]) ? [...(obj[k] as unknown[]), v] : [obj[k], v];
    } else {
      obj[k] = v;
    }
  }
  return obj;
}

export function jsonField<T>(value: unknown): T | null {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function numberField(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}