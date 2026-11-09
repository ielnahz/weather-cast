/**
 * Root Layout — App-wide configuration
 *
 * SEO: metadata, Open Graph, semantic HTML lang
 * Global providers: StoreProvider, UIProvider
 */

import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/stores";
import { UIProvider } from "@/contexts/UIContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Weather Cast — 天气预报应用",
    template: "%s | Weather Cast",
  },
  description:
    "搜索城市、查看当前天气状况和未来 7 天天气预报。支持全球城市搜索，实时天气数据。",
  keywords: ["天气", "天气预报", "weather", "forecast", "Weather Cast"],
  authors: [{ name: "Weather Cast" }],
  openGraph: {
    title: "Weather Cast — 天气预报应用",
    description: "搜索城市、查看当前天气状况和未来 7 天天气预报。",
    type: "website",
    locale: "zh_CN",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0a1628",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={geistSans.variable}>
      <body className="min-h-screen flex flex-col bg-gradient-to-b from-slate-800 via-slate-850 to-slate-900">
        <StoreProvider>
          <UIProvider>
            <Header />
            <main className="flex-1 w-full py-4 md:py-6">
              {children}
            </main>
            <Footer />
          </UIProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
