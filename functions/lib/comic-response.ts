export type ComicVariant = 'a' | 'b';

export function isValidDay(day: string | null | undefined): day is string {
  return typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day);
}

export function isValidVariant(variant: string | null | undefined): variant is ComicVariant {
  return variant === 'a' || variant === 'b';
}

export function buildComicImagePath(day: string, variant: ComicVariant): string {
  const params = new URLSearchParams({ day, variant });
  return `/api/image?${params.toString()}`;
}

export function parseStoredJson<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value !== 'string') return value as T;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function cacheHeaders(policy: string): Headers {
  return new Headers({
    'Cache-Control': policy,
  });
}
