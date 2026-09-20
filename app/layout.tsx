import type { Metadata } from "next";
import "./globals.css";
import TapmoPrivyProvider from "@/components/TapmoPrivyProvider";

export const metadata: Metadata = {
  title: "Tapmo",
  description: "Tap your Fomo balance anywhere.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <TapmoPrivyProvider>{children}</TapmoPrivyProvider>
      </body>
    </html>
  );
}
