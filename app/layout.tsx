import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { AuthGuard } from "@/lib/auth/AuthGuard";
import { ToastProvider } from "@/lib/toast";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n/messages";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Each section sets its own name in its layout.tsx; the dashboard uses the default.
  title: {
    default: "Dashboard · BeShaped Coach Portal",
    template: "%s · BeShaped Coach Portal",
  },
  description: "Manage your clients, review their training and nutrition, and build programs.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale: Locale = (await cookies()).get("beshaped-locale")?.value === "af" ? "af" : "en";

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <LocaleProvider initialLocale={locale}>
          <AuthProvider>
            <ToastProvider>
              <AuthGuard>{children}</AuthGuard>
            </ToastProvider>
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
