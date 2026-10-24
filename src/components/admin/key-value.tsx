export function KeyValue({
  items,
  columns = 2
}: {
  items: { label: string; value: React.ReactNode }[];
  columns?: 1 | 2;
}) {
  return (
    <dl className={columns === 1 ? "grid gap-3 text-xs" : "grid grid-cols-2 gap-3 text-xs"}>
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-ink2">{item.label}</dt>
          <dd className="mt-0.5 font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
