import "./globals.css";
import { Bodoni_Moda, Hanken_Grotesk } from "next/font/google";
import RotatePhonePrompt from "@/components/RotatePhonePrompt";

const display = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  title: "The Oasis · Explorer",
  description: "Interactive property explorer for The Oasis residences.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <RotatePhonePrompt />
        {children}
      </body>
    </html>
  );
}
