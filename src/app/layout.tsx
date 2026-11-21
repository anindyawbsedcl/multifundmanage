import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/shared/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MultiFundManage — Multi-Event Fund Management",
  description:
    "Manage multiple event funds — Puja, Picnic, Wedding & more. Track donations, expenses, people with professional reports.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground relative">
        <ThemeProvider>
          {children}
          <div className="fixed bottom-3 right-4 z-40 pointer-events-none select-none print:hidden">
            <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-md">
              <span>Made with</span>
              <span className="text-red-500 animate-pulse text-xs">❤️</span>
              <span>by</span>
              <span className="font-bold tracking-widest text-foreground">A N I N D Y A</span>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
