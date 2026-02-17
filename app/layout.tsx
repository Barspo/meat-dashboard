import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar"; // שים לב שהתיקייה ב-root
// import { Header } from "@/components/Header"; // אם יש לך
import { SidebarProvider } from "@/components/SidebarContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MeatPro Dashboard",
  description: "Production Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${inter.className} flex h-screen overflow-hidden bg-slate-50`} suppressHydrationWarning={true}>
        <SidebarProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col h-screen overflow-hidden relative transition-all duration-300">
             {/* <Header /> אם קיים */}
            <main className="flex-1 overflow-y-auto p-6 md:p-8">
              {children}
            </main>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}