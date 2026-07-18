import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Fraunces } from "next/font/google";
import Script from "next/script";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Recomp",
  description: "Private meal, macro, training, activity, and body recomposition tracker.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}>
        <Providers>{children}</Providers>
        <Script id="recomp-theme" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem("recomp-theme");document.documentElement.classList.toggle("dark",t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))}catch(e){document.documentElement.classList.add("dark")}`}
        </Script>
      </body>
    </html>
  );
}
