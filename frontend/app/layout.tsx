import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ScrollProgress } from "@/components/motion";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial counterweight to Geist. Used only for story headlines, which is
// what separates the narrative voice from the UI voice.
const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BitMax - Maximize your Bitcoin",
    template: "%s · BitMax",
  },
  description:
    "Maximize your Bitcoin with BitMax. Deposit sBTC to earn Bitcoin Staking rewards automatically, lock STX to boost that yield higher, and borrow against your balance on Zest - all non-custodial, on Stacks.",
  openGraph: {
    title: "BitMax - Maximize your Bitcoin",
    description:
      "Earn Bitcoin Staking rewards on sBTC, lock STX to boost that yield higher, and borrow against your balance. Non-custodial, on Stacks.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background">
        {/* Scroll reveals start hidden and are shown by IntersectionObserver.
            With JS disabled nothing would ever reveal them, so force them
            visible in that case. */}
        <noscript>
          <style>{`.reveal-init{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <Providers>
          <ScrollProgress />
          <Nav />
          <main className="flex flex-1 flex-col">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
