import type { Metadata } from "next";
import { AppNav } from "./components/AppNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kotopic ことぴく",
  description: "Image-based Japanese vocabulary practice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
