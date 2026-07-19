"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Providers } from "./Providers";
import DefaultLayout from "./components/DefaultLayout";

export default function RootLayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const content = pathname === "/auth" ? children : <DefaultLayout>{children}</DefaultLayout>;

  return <Providers>{content}</Providers>;
}
