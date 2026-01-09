import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "4Biz Notify",
  description: "Sistema de notificações de chamados 4Biz",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "4Biz Notify",
  },
};

export const viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                  .then(registration => {
                    console.log('SW registrado:', registration);

                    // Verificar atualizações a cada 60 segundos
                    setInterval(() => {
                      registration.update();
                    }, 60000);

                    // Detectar quando há uma nova versão esperando
                    registration.addEventListener('updatefound', () => {
                      const newWorker = registration.installing;

                      newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                          // Nova versão disponível
                          window.dispatchEvent(new CustomEvent('sw-update-available', {
                            detail: { registration }
                          }));
                        }
                      });
                    });
                  })
                  .catch(error => {
                    console.error('Erro ao registrar SW:', error);
                  });

                // Recarregar quando o SW for ativado
                let refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                  if (!refreshing) {
                    refreshing = true;
                    window.location.reload();
                  }
                });
              });
            }
          `,
          }}
        />
      </body>
    </html>
  );
}
