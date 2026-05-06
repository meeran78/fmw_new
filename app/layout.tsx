import type { Metadata } from "next";
import "./globals.css";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/toaster";
import RegisterDialog from "@/components/auth/RegisterDialog";
import LoginDialog from "@/components/auth/LoginDialog";
import QueryProvider from "@/context/query-provider";
import { Suspense } from "react";
import FallbackLoader from "@/components/loader/fallbackLoader";

export const metadata: Metadata = {
  title: "Falah Motors",
  description: "Falah Motors is a car dealership that sells new and used cars.",
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
  themeColor: "#7c3aed",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={` bg-[#F3F0FA] antialiased`}>
        <QueryProvider>
          <Suspense fallback={<FallbackLoader />}>
            <NuqsAdapter>
              <RegisterDialog />
              <LoginDialog />
              {children}
            </NuqsAdapter>
            <Toaster />
          </Suspense>
        </QueryProvider>
      </body>
    </html>
  );
}
