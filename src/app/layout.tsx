import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SplashScreen } from "@/components/splash-screen";
import { appleStartupImages, PWA_SPLASH_BG, SPLASH_MAX_MS } from "@/lib/pwa-splash";

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat"
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
    startupImage: appleStartupImages()
  }
};

export const viewport: Viewport = {
  themeColor: PWA_SPLASH_BG,
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=localStorage.getItem('naijaspa-theme')==='dark';document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';var stand=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;if(!stand&&!sessionStorage.getItem('naijaspa-splash')){document.documentElement.classList.add('ns-splash');document.documentElement.setAttribute('data-splash-at',String(Date.now()));setTimeout(function(){document.documentElement.classList.remove('ns-splash');},${SPLASH_MAX_MS});}}catch(e){document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}})();`
          }}
        />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <meta name="application-name" content="NaijaSpa" />
        <meta name="apple-mobile-web-app-title" content="NaijaSpa" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={montserrat.className}>
        <ThemeProvider>
          <SplashScreen />
          {children}
        </ThemeProvider>
        <script src="/sw-register.js" defer />
      </body>
    </html>
  );
}
