import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import RootLayoutContent from "./RootLayoutContent";
import { HelpButton } from "../components/HelpButton";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Doc",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="text-base relative h-screen max-h-screen bg-background/95 text-foreground">
          <Suspense>
            <RootLayoutContent>{children}</RootLayoutContent>
          </Suspense>
          <HelpButton />
        </main>
      </body>
    </html>
  );
}
