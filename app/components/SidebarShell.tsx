"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface StoredUser {
  userId: string;
  name: string;
  avatar?: string;
}

export function SidebarShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const showExportButton = Boolean(pathname && pathname !== "/" && !pathname.startsWith("/chat"));

  useEffect(() => {
    const stored = window.localStorage.getItem("liveblocks-user");

    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to parse stored user", error);
      }
    }

    const updateScreen = () => {
      const mobile = window.innerWidth < 1280;
      setIsMobile(mobile);
      setOpen(!mobile);
    };

    updateScreen();
    window.addEventListener("resize", updateScreen);
    return () => window.removeEventListener("resize", updateScreen);
  }, []);

  const panelClassName = open
    ? isMobile
      ? "fixed inset-0 z-50 w-full min-h-screen overflow-y-auto bg-white shadow-xl flex flex-col"
      : "w-[240px] h-full bg-gray-50 border-r border-gray-100 flex-shrink-0 flex flex-col"
    : "";

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDropActive(true);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDropActive(false);
    setDropError(null);

    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }

    const fileName = file.name.toLowerCase();
    if (
      !fileName.endsWith(".md") &&
      !fileName.endsWith(".markdown") &&
      file.type !== "text/markdown" &&
      file.type !== "text/plain"
    ) {
      setDropError("Only Markdown files are supported.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/import-markdown", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        setDropError(message || "Failed to import Markdown file.");
        return;
      }

      const data = await response.json();
      router.push(data.url);
    } catch (err) {
      console.error(err);
      setDropError("Failed to import Markdown file.");
    }
  };

  return (
    <>
      {open ? (
        <div
          className={`relative ${panelClassName}`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDrop={handleDrop}
          onDragLeave={() => setDropActive(false)}
        >
          <div className="flex flex-col gap-2 border-b border-gray-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-gray-900">Pages</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
              <span>
                {currentUser ? (
                  <>
                    Signed in as <span className="font-medium text-gray-900">{currentUser.name}</span>
                  </>
                ) : (
                  "Not signed in"
                )}
              </span>
              {currentUser ? (
                <button
                  type="button"
                  onClick={() => {
                    window.localStorage.removeItem("liveblocks-user");
                    setCurrentUser(null);
                    window.location.reload();
                  }}
                  className="rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Logout
                </button>
              ) : null}
            </div>
            {showExportButton ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportOpen((prev) => !prev)}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Export as
                </button>
                {exportOpen ? (
                  <div className="absolute left-0 top-full mt-1 z-20 w-full rounded-xl border border-gray-200 bg-white shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent("export-document", {
                            detail: { format: "markdown" },
                          })
                        );
                        setExportOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Markdown
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          {children}
          {dropActive ? (
            <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-r-xl bg-indigo-500/10 text-center text-sm font-semibold text-indigo-900">
              Drop markdown file to import as a new page
            </div>
          ) : null}
          {dropError ? (
            <div className="p-3 text-xs text-red-600">{dropError}</div>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed top-4 left-4 z-40 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-100"
        >
          Open sidebar
        </button>
      )}
    </>
  );
}
