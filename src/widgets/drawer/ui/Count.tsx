export function Count({ value }: { value: number }) {
  return value > 0 ? (
    <span className="ml-auto text-sm text-muted">{value}</span>
  ) : null;
}
