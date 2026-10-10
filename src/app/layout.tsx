import type { Metadata, Viewport } from "next";
import { Lexend, Roboto } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Triply — planeje, viva e registre suas viagens",
    template: "%s · Triply",
  },
  description:
    "Triply é o seu diário de viagens: planeje destinos, descubra moeda e clima e registre como foi cada aventura.",
};

export const viewport: Viewport = {
  themeColor: "#3300ff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${lexend.variable} ${roboto.variable}`}>
      <body className="font-sans">
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: { fontFamily: "var(--font-roboto), system-ui, sans-serif" },
          }}
        />
      </body>
    </html>
  );
}
