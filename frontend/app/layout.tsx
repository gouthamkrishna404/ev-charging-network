import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// A distinct geometric display face for headlines only -- gives the brand a
// voice of its own instead of leaning on the same grotesque used for body
// copy everywhere, which is what made the app read as templated.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Volt Grid",
  description: "EV Charging Network Management System",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-slate-900">
        <Toaster position="top-right" richColors closeButton toastOptions={{ style: { fontFamily: "var(--font-geist-sans)" } }} />
        <Nav />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-8">{children}</main>
        <div className="pb-16 md:pb-0">
          <Footer />
        </div>
      </body>
    </html>
  );
}
