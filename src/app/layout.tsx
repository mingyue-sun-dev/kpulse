import type { Metadata } from "next";
import "./globals.css";
import { ArtistProvider } from "@/context/ArtistContext";
import ContentPollingProvider from "@/components/notifications/ContentPollingProvider";

export const metadata: Metadata = {
  title: "KPulse - K-Pop Artist Dashboard",
  description: "Track your favorite K-Pop artists with real-time statistics, latest news, and comprehensive insights.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <ArtistProvider>
          <ContentPollingProvider>
            {children}
          </ContentPollingProvider>
        </ArtistProvider>
      </body>
    </html>
  );
}
