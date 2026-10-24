import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SplashScreen } from "@/components/splash-screen";

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
    statusBarStyle: "default",
    startupImage: [
      {
        url: "/splash/iphone-1170x2532.png",
        media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
      },
      {
        url: "/splash/iphone-1284x2778.png",
        media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)"
      },
      {
        url: "/splash/iphone-1290x2796.png",
        media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
      },
      {
        url: "/splash/ipad-2048x2732.png",
        media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)"
      }
    ]
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
            __html: `(function(){try{var t=localStorage.getItem('naijaspa-theme');if(t==='light'){document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`
          }}
        />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="apple-touch-startup-image" href="/splash/iphone-1290x2796.png" />
      </head>
      <body className={manrope.className}>
        <ThemeProvider>
          <SplashScreen />
          {children}
        </ThemeProvider>
        <script src="/sw-register.js" defer />
      </body>
    </html>
  );
}
