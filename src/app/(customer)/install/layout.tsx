import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "NaijaSpa" },
  applicationName: "NaijaSpa",
  appleWebApp: { title: "NaijaSpa" },
  description: "Add NaijaSpa to your iPhone or iPad Home Screen from Safari."
};

export default function InstallLayout({ children }: { children: React.ReactNode }) {
  return children;
}
