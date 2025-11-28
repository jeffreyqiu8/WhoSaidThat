import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Who Said That Game",
  description: "A multiplayer drinking game where you guess who said what",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}
