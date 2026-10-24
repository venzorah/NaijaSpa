"use client";

export function GoogleAuthButton({
  portal,
  next,
  label
}: {
  portal: "customer" | "vendor" | "admin";
  next?: string;
  label?: string;
}) {
  const href = `/api/auth/google?portal=${portal}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
  return (
    <a
      href={href}
      className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-line bg-card text-base font-semibold text-ink hover:bg-elev"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
        <path
          fill="#4285F4"
          d="M23.49 12.27c0-.84-.07-1.64-.21-2.41H12v4.56h6.46c-.28 1.5-1.12 2.77-2.39 3.63v3.01h3.87c2.26-2.08 3.55-5.14 3.55-8.79z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.07 7.95-2.94l-3.87-3.01c-1.08.72-2.46 1.15-4.08 1.15-3.14 0-5.8-2.12-6.75-4.97H1.26v3.1C3.24 21.3 7.31 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.25 14.23A7.23 7.23 0 0 1 4.87 12c0-.78.13-1.53.36-2.23V6.67H1.26A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.26 5.33l3.99-3.1z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.31 0 3.24 2.7 1.26 6.67l3.99 3.1C6.2 6.87 8.86 4.75 12 4.75z"
        />
      </svg>
      {label ?? "Continue with Gmail"}
    </a>
  );
}
