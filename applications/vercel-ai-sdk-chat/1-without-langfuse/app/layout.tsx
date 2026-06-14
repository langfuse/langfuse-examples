import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Langfuse Docs AI Assistant",
  description: "Ask questions about Langfuse docs with MCP-backed search.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
