"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { Command } from "cmdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  $createHeadingNode,
  $createQuoteNode,
} from "@lexical/rich-text";
import { $createCodeNode } from "@lexical/code";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import {
  INSERT_TABLE_COMMAND,
  TableCellNode,
  TableNode,
  TableRowNode,
} from "@lexical/table";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import {
  COMMAND_PRIORITY_EDITOR,
  KEY_DOWN_COMMAND,
  $getSelection,
  $isRangeSelection,
} from "lexical";
import { $setBlocksType } from "@lexical/selection";
import { createPortal } from "react-dom";

const COMMANDS = [
  {
    id: "table",
    label: "Table",
    description: "Insert a 3x3 table",
    action: (editor: any) => {
      editor.dispatchCommand(INSERT_TABLE_COMMAND, {
        columns: "3",
        rows: "3",
      });
    },
  },
  {
    id: "h1",
    label: "Heading 1",
    description: "Insert a top-level heading",
    action: (editor: any) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        $setBlocksType(selection, () => $createHeadingNode("h1"));
      });
    },
  },
  {
    id: "h2",
    label: "Heading 2",
    description: "Insert a second-level heading",
    action: (editor: any) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        $setBlocksType(selection, () => $createHeadingNode("h2"));
      });
    },
  },
  {
    id: "quote",
    label: "Quote",
    description: "Insert a quote block",
    action: (editor: any) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        $setBlocksType(selection, () => $createQuoteNode());
      });
    },
  },
  {
    id: "bullet-list",
    label: "Bulleted list",
    description: "Start a bulleted list",
    action: (editor: any) => {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    },
  },
  {
    id: "numbered-list",
    label: "Numbered list",
    description: "Start a numbered list",
    action: (editor: any) => {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    },
  },
  {
    id: "code-block",
    label: "Code block",
    description: "Insert a code block",
    action: (editor: any) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        $setBlocksType(selection, () => $createCodeNode());
      });
    },
  },
  {
    id: "divider",
    label: "Divider",
    description: "Insert a horizontal rule",
    action: (editor: any) => {
      editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
    },
  },
];

export function SlashCommandPlugin() {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null
  );
  const commandRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const listener = (event: MouseEvent) => {
      if (commandRef.current && !commandRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", listener);
    return () => window.removeEventListener("mousedown", listener);
  }, [open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const filteredCommands = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return COMMANDS.filter(
      (command) =>
        !normalized ||
        command.label.toLowerCase().includes(normalized) ||
        command.description.toLowerCase().includes(normalized)
    );
  }, [query]);

  const executeCommand = useCallback(
    (commandId: string) => {
      const command = COMMANDS.find((item) => item.id === commandId);
      if (!command) {
        return;
      }

      command.action(editor);
      setOpen(false);
      setQuery("");
    },
    [editor]
  );

  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (event.key === "/" && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
          const selection = window.getSelection();
          if (!selection?.rangeCount) {
            return false;
          }

          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setPosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
          });
          setOpen(true);
          setQuery("");
          event.preventDefault();
          return true;
        }

        if (open && event.key === "Escape") {
          setOpen(false);
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, open]);

  if (!open || !position) {
    return null;
  }

  return createPortal(
    <div
      ref={commandRef}
      className="absolute z-50 min-w-[240px] rounded-xl border border-gray-300 bg-white shadow-xl"
      style={{ top: position.top + 6, left: position.left }}
    >
      <Command>
        <div className="p-2">
          <Command.Input
            ref={inputRef}
            value={query}
            onValueChange={setQuery}
            placeholder="Type a command..."
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <Command.List className="max-h-60 overflow-y-auto px-1 pb-1">
          {filteredCommands.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-500">No commands found.</p>
          ) : (
            filteredCommands.map((command) => (
              <Command.Item
                key={command.id}
                value={command.label}
                onSelect={() => executeCommand(command.id)}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 data-[selected]:bg-indigo-50 data-[selected]:text-indigo-700"
              >
                <div className="font-medium">{command.label}</div>
                <div className="text-xs text-gray-500">{command.description}</div>
              </Command.Item>
            ))
          )}
        </Command.List>
      </Command>
    </div>,
    document.body
  );
}
