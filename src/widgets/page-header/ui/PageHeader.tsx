export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h1 className="mt-5 text-[length:var(--page-title-size)] leading-[var(--page-title-size)] font-medium">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-[length:var(--page-subtitle-size)] leading-[var(--page-subtitle-line)] font-light text-muted">
          {subtitle}
        </p>
      )}
    </div>
  );
}
