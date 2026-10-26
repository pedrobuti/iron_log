import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/store/AppProvider";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "IronLog", template: "%s · IronLog" },
  description: "Acompanhamento de treinos de musculação com foco em hipertrofia: rotina semanal, registro de séries, progressão de carga e recuperação.",
  applicationName: "IronLog",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#090a0c" },
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** Aplica o tema salvo antes da hidratação para evitar flash. */
const themeScript = `(function(){try{var s=localStorage.getItem('ironlog:v1:settings');var t=s?JSON.parse(s).theme:'dark';var c=document.documentElement.classList;if(t==='light'){c.remove('dark');document.documentElement.style.colorScheme='light';}else{c.add('dark');document.documentElement.style.colorScheme='dark';}}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.variable}>
        <AppProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
