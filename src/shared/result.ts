export type Ok<T> = { ok: true; value: T };
export type Err<E extends string = string> = {
  ok: false;
  error: { code: E; message: string };
};
export type Result<T, E extends string = string> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}
export function err<E extends string>(code: E, message: string): Err<E> {
  return { ok: false, error: { code, message } };
}

export function unwrap<T, E extends string>(r: Result<T, E>): T {
  if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
  return r.value;
}
