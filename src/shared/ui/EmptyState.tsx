export function EmptyState({
  text,
  centered,
}: {
  text: string;
  centered: boolean;
}) {
  return (
    <p
      className={
        centered
          ? 'mx-2 mt-30 text-center text-lg text-muted'
          : 'mx-2 mt-6 text-sm text-muted'
      }
    >
      {text}
    </p>
  );
}
