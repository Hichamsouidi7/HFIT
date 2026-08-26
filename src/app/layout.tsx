import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HFit",
  description: "Suivi nutrition, entraînement et perte de poids",
  manifest: "/manifest.json",
  // iOS ignores the manifest icons and reads this one when adding to the home
  // screen, so it has to be declared separately.
  icons: { apple: "/icons/icon-180.png", icon: "/icons/icon-192.png" },
  appleWebApp: { capable: true, title: "HFit", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#ececea",
  // The app is a fixed mobile layout; pinch-zooming it only breaks the design.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
