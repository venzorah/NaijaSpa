import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: { default: "NaijaSpa", template: "%s · NaijaSpa" },
  description: "Premium spa, massage and wellness marketplace for Nigeria.",
  applicationName: "NaijaSpa",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/brand/icon-white.png", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png" }]
  },
  appleWebApp: { capable: true, title: "NaijaSpa", statusBarStyle: "black-translucent" }
};

export const viewport: Viewport = {
  themeColor: "#101713",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('naijaspa-theme');if(t==='light'){document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`
          }}
        />
        <link rel="icon" href="/brand/icon-white.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <script src="/sw-register.js" defer />
      </body>
    </html>
  );
}
