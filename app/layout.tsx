import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/toaster";
import RegisterDialog from "@/components/auth/RegisterDialog";
import LoginDialog from "@/components/auth/LoginDialog";
import QueryProvider from "@/context/query-provider";
import { Suspense } from "react";
import FallbackLoader from "@/components/loader/fallbackLoader";

export const metadata: Metadata = {
  title: "AHM Auto",
  description: "AHM Auto is a car dealership that sells new and used cars in the DMV area.",
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#7c3aed",
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
