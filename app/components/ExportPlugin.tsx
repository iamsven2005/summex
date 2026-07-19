"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useStorage } from "@liveblocks/react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";

export function ExportPlugin() {
  const [editor] = useLexicalComposerContext();
  const title = useStorage((root) => root.title ?? "Untitled document");
  const [markdownPreview, setMarkdownPreview] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const sanitizeFileName = useCallback((name: string) => {
    return name.replace(/[\\/:*?"<>|]/g, "-").trim() || "document";
  }, []);

  const fileName = title ? sanitizeFileName(title) : "document";

  const generateMarkdownPreview = useCallback(() => {
    let markdown = "";
    editor.getEditorState().read(() => {
      markdown = $convertToMarkdownString(TRANSFORMERS);
    });

    const titleHeading = title ? `# ${title.trim()}\n\n` : "";
    setMarkdownPreview(`${titleHeading}${markdown}`);
    setPreviewOpen(true);
  }, [editor, title]);

  const exportMarkdownFile = useCallback(() => {
    if (!markdownPreview) {
      return;
    }

    const blob = new Blob([markdownPreview], {
      type: "text/markdown;charset=utf-8",
    });
    const fileNameWithTitle = `${fileName}.md`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileNameWithTitle;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [markdownPreview, sanitizeFileName, title]);

  useEffect(() => {
    const handleExportEvent = (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        return;
      }
      if (event.detail?.format === "markdown") {
        generateMarkdownPreview();
      }
    };

    window.addEventListener("export-document", handleExportEvent);
    return () => window.removeEventListener("export-document", handleExportEvent);
  }, [generateMarkdownPreview]);

  if (!previewOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Markdown Preview</h2>
            <p className="text-xs text-gray-500">Preview the current document as Markdown.</p>
          </div>
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
        <div className="p-4">
          <textarea
            readOnly
            value={markdownPreview}
            className="min-h-[320px] w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-900"
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3">
          <button
            type="button"
            onClick={exportMarkdownFile}
            className="rounded-md border border-gray-200 bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
          >
            Export .md
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
