import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/layout/theme-provider";
import { ColorThemeSync } from "@/components/layout/color-theme-sync";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/config/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} – Dit AI-styresystem`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteConfig.name,
  },
  icons: {
    icon: "/icon-512.png",
    apple: "/apple-icon.png",
  },
};

// PWA / mobil: temafarve og viewport-opsætning
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6fe" },
    { media: "(prefers-color-scheme: dark)", color: "#060c1c" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // lang="da": appen er på dansk. suppressHydrationWarning kræves af next-themes.
    <html
      lang="da"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body>
        {/* Farvetema (data-theme) genskabes fra localStorage FØR første paint,
            så siden aldrig blinker grønt før fx Navy-temaet slår igennem.
            Nøglen skal matche THEME_STORAGE_KEY i features/theme/themes.ts. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("lifeos-color-theme");if(t&&t!=="skov")document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ColorThemeSync />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
