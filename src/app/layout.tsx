import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { BASE_PATH } from "@/lib/assetPath";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const SITE_TITLE = "Stellaris Tech Tree — Research Progress Tracker (4.3.7)";
const SITE_DESCRIPTION =
  "Interactive Stellaris technology tree with DLC filters, rarity color coding, and save/load research progress. Data from Stellaris 4.3.7 (Cetus).";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: [
    "Stellaris",
    "tech tree",
    "technology",
    "research",
    "tracker",
    "DLC",
  ],
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  applicationName: "Stellaris Tech Tree",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Stellaris Tech Tree",
  },
};

export const viewport: Viewport = {
  themeColor: "#05070e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} antialiased bg-background text-foreground`}
      >
        {/* social-share tags — rendered as plain <meta> so the image URL stays
            relative to wherever the site is hosted (no metadataBase needed) */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Stellaris Tech Tree" />
        <meta property="og:title" content={SITE_TITLE} />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:image" content={`${BASE_PATH}/og-image.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Stellaris Tech Tree — interactive research progress tracker" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SITE_TITLE} />
        <meta name="twitter:description" content={SITE_DESCRIPTION} />
        <meta name="twitter:image" content={`${BASE_PATH}/og-image.png`} />
        {children}
        <ServiceWorkerRegister />
        <Toaster position="bottom-right" theme="dark" richColors />
      </body>
    </html>
  );
}
