let idCounter = 0;

/** Locally unique, roughly time-ordered id for SQLite TEXT primary keys. */
export function generateId(): string {
  idCounter++;
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  const seq = idCounter.toString(36);
  return `${ts}-${rand}-${seq}`;
}
