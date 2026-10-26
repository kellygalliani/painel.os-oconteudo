import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { TemaProvider } from "@/components/shared/TemaProvider";
import "./globals.css";

const instrumentSans = localFont({
  src: [
    { path: "../fonts/InstrumentSans-Latin-Variable.woff2", style: "normal", weight: "400 700" },
    { path: "../fonts/InstrumentSans-LatinExt-Variable.woff2", style: "normal", weight: "400 700" },
  ],
  variable: "--font-instrument-sans",
  display: "swap",
});

const newsreader = localFont({
  src: [{ path: "../fonts/Newsreader-Latin-Variable.woff2", style: "normal", weight: "400 700" }],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "OS oconteudo", template: "%s · OS oconteudo" },
  description: "Painel interno da oconteudo.",
  icons: { icon: "/brand/icone-gradiente.svg" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${instrumentSans.variable} ${newsreader.variable} font-sans antialiased`}>
        <TemaProvider>
          {children}
          <Toaster position="bottom-center" />
        </TemaProvider>
      </body>
    </html>
  );
}
