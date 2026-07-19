import { SparklesIcon } from "../icons/SparklesIcon";
import {
  $createParagraphNode,
  $getSelection,
  FORMAT_TEXT_COMMAND,
} from "lexical";
import { BoldIcon } from "../icons/BoldIcon";
import { OPEN_FLOATING_COMPOSER_COMMAND } from "@liveblocks/react-lexical";
import { CommentIcon } from "../icons/CommentIcon";
import { motion } from "framer-motion";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { MouseEventHandler, ReactNode, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { $setBlocksType } from "@lexical/selection";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { useActiveBlock } from "../hooks/useActiveBlock";
import { ItalicIcon } from "../icons/ItalicIcon";
import { UnderlineIcon } from "../icons/UnderlineIcon";
import { StrikethroughIcon } from "../icons/StrikethroughIcon";
import { CodeIcon } from "../icons/CodeIcon";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { useStorage } from "@liveblocks/react";

// Options in the toolbar's dropdown
const DROPDOWN_OPTIONS = [
  {
    id: "paragraph",
    text: "Paragraph",
  },
  {
    id: "quote",
    text: "Quote",
  },
  {
    id: "h1",
    text: "Heading 1",
  },
  {
    id: "h2",
    text: "Heading 2",
  },
  {
    id: "h3",
    text: "Heading 3",
  },
  {
    id: "h4",
    text: "Heading 4",
  },
  {
    id: "h5",
    text: "Heading 5",
  },
  {
    id: "h6",
    text: "Heading 6",
  },
  {
    id: "table",
    text: "Table",
  },
];

type DropdownIds = (typeof DROPDOWN_OPTIONS)[number]["id"];

export function FloatingToolbarOptions({
  state,
  setState,
  onOpenAi,
}: {
  state: "default" | "ai" | "closed";
  setState: (state: "default" | "ai" | "closed") => void;
  onOpenAi: () => void;
}) {
  const [editor] = useLexicalComposerContext();
  const activeBlock = useActiveBlock();
  const title = useStorage((root) => root.title ?? "Untitled document");
  const [markdownPreview, setMarkdownPreview] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

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
  }, [markdownPreview, title, sanitizeFileName]);

  const exportDocument = useCallback(
    (format: "markdown") => {
      if (format === "markdown") {
        generateMarkdownPreview();
      }
    },
    [generateMarkdownPreview]
  );

  // Change between block types
  useEffect(() => {
    const handleExportEvent = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.format === "markdown") {
        exportDocument("markdown");
      }
    };

    window.addEventListener("export-document", handleExportEvent);
    return () => window.removeEventListener("export-document", handleExportEvent);
  }, [exportDocument]);

  const toggleBlock = useCallback(
    (type: DropdownIds) => {
      const selection = $getSelection();

      if (activeBlock === type || type === "paragraph") {
        return $setBlocksType(selection, () => $createParagraphNode());
      }

      if (type === "h1") {
        return $setBlocksType(selection, () => $createHeadingNode("h1"));
      }

      if (type === "h2") {
        return $setBlocksType(selection, () => $createHeadingNode("h2"));
      }

      if (type === "h3") {
        return $setBlocksType(selection, () => $createHeadingNode("h3"));
      }

      if (type === "h4") {
        return $setBlocksType(selection, () => $createHeadingNode("h4"));
      }

      if (type === "h5") {
        return $setBlocksType(selection, () => $createHeadingNode("h5"));
      }

      if (type === "h6") {
        return $setBlocksType(selection, () => $createHeadingNode("h6"));
      }

      if (type === "table") {
        return editor.dispatchCommand(INSERT_TABLE_COMMAND, {
          columns: "3",
          rows: "3",
        });
      }

      if (type === "quote") {
        return $setBlocksType(selection, () => $createQuoteNode());
      }
    },
    [activeBlock, editor]
  );

  return (
    <motion.div
      layoutId="floating-toolbar-main"
      layout="size"
      style={{ display: state !== "ai" ? "block" : "none" }}
      className="p-1 rounded-lg border shadow-lg border-border/80 bg-card pointer-events-auto origin-top text-gray-600"
      initial={{ x: 0, y: 0, opacity: 0, scale: 0.93 }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      transition={{
        type: "spring",
        duration: 0.25,
      }}
    >
      <div className="flex items-center justify-center gap-1">
        <button
          onClick={() => {
            setState("ai");
            onOpenAi();
          }}
          className="px-2 inline-flex relative items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 data-[active]:bg-accent"
        >
          <div className="flex items-center text-indigo-500 font-semibold">
            <SparklesIcon className="h-4 -ml-1" /> AI
          </div>
        </button>

        <span className="w-[1px] py-3.5 bg-border/50" />

        <label htmlFor="select-block" className="h-8 items-center align-top">
          <span className="sr-only">Select block type</span>
          <select
            id="select-block"
            onInput={(e) => {
              editor.update(() => toggleBlock(e.currentTarget.value));
            }}
            className="bg-white border-0 h-8 pl-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground data-[active]:bg-accent"
            value={activeBlock || "paragraph"}
          >
            {DROPDOWN_OPTIONS.map(({ id, text }) => (
              <option key={id} value={id}>
                {text}
              </option>
            ))}
          </select>
        </label>

        <ToolbarButton
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
            setState("default");
          }}
        >
          <BoldIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
            setState("default");
          }}
        >
          <ItalicIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
            setState("default");
          }}
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
            setState("default");
          }}
        >
          <StrikethroughIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
            setState("default");
          }}
        >
          <CodeIcon className="w-4 h-4" />
        </ToolbarButton>

        <div className="relative">
          <ToolbarButton
            onClick={() => setExportOpen((prev) => !prev)}
            className="flex gap-1"
          >
            Export
          </ToolbarButton>
          {exportOpen ? (
            <div className="absolute right-0 top-full mt-1 z-20 w-32 rounded-xl border border-gray-200 bg-white shadow-lg">
              <button
                type="button"
                onClick={() => {
                  exportDocument("markdown");
                  setExportOpen(false);
                  setState("default");
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                Markdown
              </button>
            </div>
          ) : null}
        </div>

        <span className="w-[1px] py-3.5 bg-border/50" />

        <ToolbarButton
          onClick={() => {
            editor.dispatchCommand(OPEN_FLOATING_COMPOSER_COMMAND, undefined);
            setState("closed");
          }}
        >
          <CommentIcon className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {previewOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Markdown Preview
                  </h2>
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
        )}
    </motion.div>
  );
}

function ToolbarButton({
  onClick,
  children,
  className,
}: {
  onClick: MouseEventHandler<HTMLButtonElement>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex relative items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground min-w-[32px] h-8 px-2 data-[active]:bg-accent ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
