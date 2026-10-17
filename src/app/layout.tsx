import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/**
 * IBM Plex Sans Thai covers Thai and Latin in one family, so numbers in the
 * tables line up with the Thai labels next to them.
 */
const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-sans",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Smart Stock — ระบบคลังสินค้าอัจฉริยะ",
    template: "%s · Smart Stock",
  },
  description:
    "ระบบคลังสินค้าอัจฉริยะ กรณีศึกษา บริษัท มาเธอร์ มาร์เก็ตติ้ง จำกัด (มหาชน)",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${plexThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
