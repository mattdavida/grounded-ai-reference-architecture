import type { Metadata } from "next";

import { VoiceChatPanel } from "@/components/voice/VoiceChatPanel";
import "./globals.css";

export const metadata: Metadata = {
  title: "EAIM Reference Architecture",
  description:
    "Enterprise AI Modernization Reference Architecture — grounded conversational AI over precomputed portfolio metrics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <VoiceChatPanel />
      </body>
    </html>
  );
}
