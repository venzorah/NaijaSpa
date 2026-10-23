"use client";

export function LogoutButton() {
  return (
    <button
      className="mt-8 text-sm underline"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        location.href = "/";
      }}
    >
      Log out
    </button>
  );
}
