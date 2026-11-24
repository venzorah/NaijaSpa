export function ShopAdminError({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-6 rounded-3xl border border-red-500/30 bg-red-500/5 px-4 py-6 text-sm text-red-700 dark:text-red-300">
      {message} Refresh this page. Shop admin loads live data instead of the public Shop fallback.
    </p>
  );
}
