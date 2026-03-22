import type { Metadata, Viewport } from "next";

// Triggering build...
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ClientLayoutWrapper } from "@/components/ClientLayoutWrapper";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#F7F8FA",
};

export const metadata: Metadata = {
  title: "E5 Chronicles | Management",
  description: "Modern Employee Monitoring SaaS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FocusSync",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#F7F8FA] antialiased`}>
        <AuthProvider>
          <ClientLayoutWrapper>
            {children}
          </ClientLayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
