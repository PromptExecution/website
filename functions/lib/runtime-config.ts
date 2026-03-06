export function getMissingBindings(env: Record<string, unknown> | undefined, names: string[]) {
  return names.filter((name) => env?.[name] == null);
}

export function requireBindings(
  env: Record<string, unknown> | undefined,
  names: string[],
): Response | null {
  const missingBindings = getMissingBindings(env, names);

  if (missingBindings.length === 0) {
    return null;
  }

  return Response.json(
    {
      error: 'Service misconfigured',
      missingBindings,
    },
    { status: 503 },
  );
}

export function assertBindings(
  env: Record<string, unknown> | undefined,
  names: string[],
): void {
  const missingBindings = getMissingBindings(env, names);

  if (missingBindings.length > 0) {
    throw new Error(`Missing required bindings: ${missingBindings.join(', ')}`);
  }
}
