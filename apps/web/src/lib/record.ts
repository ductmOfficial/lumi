/** A copy of `record` without `key` (instead of `delete`, which mutates and defeats typing). */
export function omitKey<K extends PropertyKey, V>(record: Record<K, V>, key: K): Record<K, V> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => k !== String(key))) as Record<
    K,
    V
  >;
}
