import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope"
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-cormorant"
});

export const metadata: Metadata = {
  title: { default: "NaijaSpa", template: "%s · NaijaSpa" },
  description: "Premium spa, massage and wellness marketplace for Nigeria.",
  applicationName: "NaijaSpa",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png" }]
  },
  appleWebApp: {
    capable: true,
    title: "NaijaSpa",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  themeColor: "#0c1210",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${manrope.variable} ${cormorant.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=localStorage.getItem('naijaspa-theme')!=='light';document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}})();`
          }}
        />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>
      <body className={manrope.className}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <script src="/sw-register.js" defer />
      </body>
    </html>
  );
}
