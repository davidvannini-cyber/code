import type { ProjectData } from "./threeMF";

// Crash safety net: the project (features, placements, colours; the meshes are
// rebuilt from the features) is kept in the browser's own storage after every
// change. It lives inside Safari/Chrome, not in the Files app, so it complements
// the saved .3mf instead of replacing it.
const KEY = "model3d-autosave-v1";

export interface AutosaveEntry {
  savedAt: number;
  project: ProjectData;
}

export function writeAutosave(project: ProjectData): number | null {
  try {
    const savedAt = Date.now();
    localStorage.setItem(KEY, JSON.stringify({ savedAt, project } satisfies AutosaveEntry));
    return savedAt;
  } catch {
    return null; // storage full, blocked or private mode: autosave is best-effort
  }
}

export function readAutosave(): AutosaveEntry | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as AutosaveEntry;
    return entry?.project?.features?.length ? entry : null;
  } catch {
    return null;
  }
}

export function clearAutosave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
