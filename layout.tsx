import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
});

export const metadata: Metadata = {
  title: "Timemark Payroll",
  description: "Upload timemark images — get auto-computed weekly payroll",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${archivo.variable} ${plexMono.variable} [font-family:var(--font-archivo)] bg-[#0d120e] text-[#e8ede6] antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
