import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import LightPillar from '@/components/LightPillar';
import Protection from '@/components/Protection';

export const metadata = {
  title: 'Punch — Minecraft Client',
  description: 'Punch — клиент нового поколения для Minecraft',
};

export const viewport = {
  themeColor: '#070310',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-sans/style.css"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-mono/style.css"
          rel="stylesheet"
        />
      </head>
      <body>
        <LightPillar
          topColor="#a855f7"
          bottomColor="#1e1b4b"
          intensity={0.45}
          glowAmount={2.5}
          pillarWidth={2.0}
          pillarHeight={1.8}
          noiseIntensity={0.6}
          rotationDeg={15}
        />
        <Protection />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
