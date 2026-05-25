/** Parse repeated query params or comma-separated integers. */
export function parseIdListQuery(
  value: string | string[] | undefined,
): number[] | undefined {
  if (value === undefined || value === "") return undefined;

  const parts = Array.isArray(value)
    ? value.flatMap((v) => String(v).split(","))
    : String(value).split(",");

  const ids = [
    ...new Set(
      parts
        .map((p) => Number(p.trim()))
        .filter((n) => Number.isInteger(n) && n >= 1),
    ),
  ];

  return ids.length > 0 ? ids : undefined;
}
