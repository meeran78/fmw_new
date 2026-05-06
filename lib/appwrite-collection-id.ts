/**
 * Validates env-supplied Appwrite database collection `$id`:
 * max 36 chars; `a-z`, `A-Z`, `0-9`, `_`, `-`; must not start with `_`.
 */
export function normalizeCollectionIdEnv(value: string | undefined): string {
  return String(value ?? "").trim();
}

export function isValidAppwriteCollectionId(id: string): boolean {
  if (id.length === 0 || id.length > 36) return false;
  if (id.startsWith("_")) return false;
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

export function collectionIdEnvError(envVarName: string, rawId: string): string {
  const preview =
    rawId.length === 0 ? "(empty)" : rawId.length > 24 ? `${rawId.slice(0, 24)}…` : rawId;
  return `${envVarName} is missing or invalid (${preview}). Paste the Collection ID from Appwrite Console → Database → your database → Collections → open the collection → Settings (letters, numbers, underscores, hyphens; max 36 characters; no spaces or quotes).`;
}

/** Clear hint when env ID passes validation but Appwrite has no such collection. */
export function humanizeAppwriteCollectionNotFound(
  envVarName: string
): string {
  return `Appwrite returned collection_not_found for ${envVarName}. That ID does not exist on database NEXT_PUBLIC_APPWRITE_DATABASE_ID. In Console → Database → select that database → Collections: either create the collection or copy its exact Collection ID into ${envVarName}.`;
}

export function humanizeAppwriteError(
  error: unknown,
  envVarName: string
): string | undefined {
  const err = error as { name?: string; type?: string };
  if (err?.name !== "AppwriteException") return undefined;
  if (err.type === "collection_not_found") {
    return humanizeAppwriteCollectionNotFound(envVarName);
  }
  return undefined;
}

/** Throws with a clear config message instead of Appwrite `general_argument_invalid`. */
export function requireValidCollectionId(id: string, envVarName: string): string {
  const normalized = normalizeCollectionIdEnv(id);
  if (!isValidAppwriteCollectionId(normalized)) {
    throw new Error(collectionIdEnvError(envVarName, normalized));
  }
  return normalized;
}
