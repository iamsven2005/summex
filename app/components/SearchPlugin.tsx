"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  TextNode,
} from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface SearchResult {
  nodeKey: string;
  offset: number;
  length: number;
}

interface MultiCaret {
  nodeKey: string;
  offset: number;
}

function getTextNode(element: HTMLElement): globalThis.Text | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  return walker.nextNode() as globalThis.Text | null;
}

export function SearchPlugin() {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [showReplace, setShowReplace] = useState(false);
  const [multiResults, setMultiResults] = useState<SearchResult[]>([]);
  const [multiCarets, setMultiCarets] = useState<MultiCaret[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const collectResults = useCallback(
    (query: string): SearchResult[] => {
      if (!query) return [];
      let matches: SearchResult[] = [];

      editor.getEditorState().read(() => {
        const lowerQuery = query.toLowerCase();
        const visit = (node: any) => {
          if (node instanceof TextNode) {
            const text = node.getTextContent().toLowerCase();
            let offset = 0;
            while ((offset = text.indexOf(lowerQuery, offset)) !== -1) {
              matches.push({ nodeKey: node.getKey(), offset, length: query.length });
              offset += query.length;
            }
          }
          node.getChildren?.().forEach(visit);
        };
        visit($getRoot());
      });

      return matches;
    },
    [editor]
  );

  const performSearch = useCallback(
    (query: string) => {
      const matches = collectResults(query.trim());
      setResults(matches);
      setCurrentResultIndex(0);
      setMultiResults([]);
      setMultiCarets([]);
    },
    [collectResults]
  );

  // Highlight every result, emphasize the active/multi-selected results, and scroll to it.
  useEffect(() => {
    const highlights = (CSS as any).highlights;
    const HighlightConstructor = (globalThis as any).Highlight;
    if (!highlights || !HighlightConstructor) return;

    const allRanges: Range[] = [];
    const activeRanges: Range[] = [];
    const multiKeys = new Set(
      multiResults.map((result) => `${result.nodeKey}:${result.offset}`)
    );

    results.forEach((result, index) => {
      const element = editor.getElementByKey(result.nodeKey);
      const textNode = element ? getTextNode(element) : null;
      if (!textNode || result.offset + result.length > textNode.length) return;

      const range = document.createRange();
      range.setStart(textNode, result.offset);
      range.setEnd(textNode, result.offset + result.length);
      allRanges.push(range);
      if (
        index === currentResultIndex ||
        multiKeys.has(`${result.nodeKey}:${result.offset}`)
      ) {
        activeRanges.push(range);
      }
    });

    highlights.set("doc-search", new HighlightConstructor(...allRanges));
    highlights.set("doc-search-active", new HighlightConstructor(...activeRanges));

    const active = activeRanges[activeRanges.length - 1];
    active?.startContainer.parentElement?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    return () => {
      highlights.delete("doc-search");
      highlights.delete("doc-search-active");
    };
  }, [currentResultIndex, editor, multiResults, results]);

  const replaceMatches = useCallback(
    (matches: SearchResult[], value: string) => {
      const nextCarets: MultiCaret[] = [];
      editor.update(() => {
        const byNode = new Map<string, SearchResult[]>();
        matches.forEach((match) => {
          const group = byNode.get(match.nodeKey) ?? [];
          group.push(match);
          byNode.set(match.nodeKey, group);
        });

        byNode.forEach((group, nodeKey) => {
          const node = $getNodeByKey(nodeKey);
          if (!$isTextNode(node)) return;
          const source = node.getTextContent();
          let output = "";
          let sourceOffset = 0;
          group.sort((a, b) => a.offset - b.offset).forEach((match) => {
            output += source.slice(sourceOffset, match.offset) + value;
            nextCarets.push({ nodeKey, offset: output.length });
            sourceOffset = match.offset + match.length;
          });
          node.setTextContent(output + source.slice(sourceOffset));
        });
      });
      setMultiResults([]);
      setMultiCarets(nextCarets);
    },
    [editor]
  );

  const editAtCarets = useCallback(
    (value: string, backspace = false) => {
      const nextCarets: MultiCaret[] = [];
      editor.update(() => {
        const byNode = new Map<string, MultiCaret[]>();
        multiCarets.forEach((caret) => {
          const group = byNode.get(caret.nodeKey) ?? [];
          group.push(caret);
          byNode.set(caret.nodeKey, group);
        });
        byNode.forEach((group, nodeKey) => {
          const node = $getNodeByKey(nodeKey);
          if (!$isTextNode(node)) return;
          const source = node.getTextContent();
          let output = "";
          let sourceOffset = 0;
          group.sort((a, b) => a.offset - b.offset).forEach((caret) => {
            const start = backspace ? Math.max(sourceOffset, caret.offset - 1) : caret.offset;
            output += source.slice(sourceOffset, start) + value;
            nextCarets.push({ nodeKey, offset: output.length });
            sourceOffset = caret.offset;
          });
          node.setTextContent(output + source.slice(sourceOffset));
        });
      });
      setMultiCarets(nextCarets);
    },
    [editor, multiCarets]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        let selectedText = "";
        editor.getEditorState().read(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection) && !selection.isCollapsed()) {
            selectedText = selection.getTextContent();
          }
        });

        if (selectedText) {
          setSearchQuery(selectedText);
          performSearch(selectedText);
        }
        setOpen(true);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        let query = searchQuery;
        let anchorKey: string | null = null;
        let anchorOffset = 0;

        editor.getEditorState().read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return;
          const node = selection.anchor.getNode();
          if (!$isTextNode(node)) return;
          anchorKey = node.getKey();
          anchorOffset = selection.anchor.offset;
          if (!query) {
            query = selection.getTextContent();
            if (!query) {
              const text = node.getTextContent();
              const left = text.slice(0, anchorOffset).match(/[\w-]+$/)?.[0] ?? "";
              const right = text.slice(anchorOffset).match(/^[\w-]+/)?.[0] ?? "";
              query = left + right;
            }
          }
        });

        if (!query) return;
        const matches = collectResults(query);
        if (matches.length === 0) return;
        setSearchQuery(query);
        setResults(matches);
        setOpen(true);
        setMultiCarets([]);
        setMultiResults((selected) => {
          const selectedKeys = new Set(selected.map((item) => `${item.nodeKey}:${item.offset}`));
          let next =
            selected.length === 0 && anchorKey
              ? matches.find(
                  (item) =>
                    item.nodeKey === anchorKey &&
                    item.offset <= anchorOffset &&
                    item.offset + item.length >= anchorOffset
                )
              : undefined;
          const lastIndex = selected.length
            ? matches.findIndex(
                (item) =>
                  item.nodeKey === selected[selected.length - 1].nodeKey &&
                  item.offset === selected[selected.length - 1].offset
              )
            : -1;
          next ??= matches
            .slice(lastIndex + 1)
            .find((item) => !selectedKeys.has(`${item.nodeKey}:${item.offset}`));
          next ??= matches.find(
            (item) => !selectedKeys.has(`${item.nodeKey}:${item.offset}`)
          );
          return next ? [...selected, next] : selected;
        });
        return;
      }

      if (event.key === "Escape") {
        setOpen(false);
        setMultiResults([]);
        setMultiCarets([]);
        return;
      }

      if (multiResults.length > 1 && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        replaceMatches(multiResults, event.key);
      } else if (multiResults.length > 1 && event.key === "Backspace") {
        event.preventDefault();
        replaceMatches(multiResults, "");
      } else if (multiCarets.length > 1 && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        editAtCarets(event.key);
      } else if (multiCarets.length > 1 && event.key === "Backspace") {
        event.preventDefault();
        editAtCarets("", true);
      } else if (event.key === "Enter" && open && !showReplace) {
        event.preventDefault();
        setCurrentResultIndex((index) => (index + 1) % (results.length || 1));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [collectResults, editAtCarets, editor, multiCarets, multiResults, open, performSearch, replaceMatches, results.length, searchQuery, showReplace]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const replaceOne = () => {
    const match = results[currentResultIndex];
    if (!match) return;
    replaceMatches([match], replaceQuery);
    performSearch(searchQuery);
  };

  const replaceAll = () => {
    replaceMatches(results, replaceQuery);
    performSearch(searchQuery);
  };

  return (
    <>
      <style>{`
        ::highlight(doc-search) { background: #fde68a; color: inherit; }
        ::highlight(doc-search-active) { background: #60a5fa; color: white; }
      `}</style>
      {open
        ? createPortal(
            <div className="fixed right-6 top-20 z-40 w-96 rounded-lg border border-gray-300 bg-white p-4 shadow-lg">
              <div className="mb-2 flex gap-2">
                <input ref={inputRef} value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); performSearch(event.target.value); }} placeholder="Find..." className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
                <button onClick={() => setOpen(false)} className="rounded-md px-3 hover:bg-gray-100">×</button>
              </div>
              <div className="mb-3 text-xs text-gray-600">
                {results.length ? `${currentResultIndex + 1} of ${results.length}` : "No matches"}
                {multiResults.length > 0 ? ` · ${multiResults.length} selected with Ctrl/Cmd+D` : ""}
              </div>
              <div className="mb-3 flex gap-2">
                <button onClick={() => setCurrentResultIndex((index) => (index - 1 + results.length) % results.length)} disabled={!results.length} className="rounded border px-2 py-1 text-xs disabled:opacity-50">↑ Previous</button>
                <button onClick={() => setCurrentResultIndex((index) => (index + 1) % results.length)} disabled={!results.length} className="rounded border px-2 py-1 text-xs disabled:opacity-50">Next ↓</button>
                <button onClick={() => setShowReplace((value) => !value)} className="ml-auto text-xs text-indigo-600">{showReplace ? "Hide replace" : "Replace"}</button>
              </div>
              {showReplace ? (
                <div className="border-t pt-3">
                  <input value={replaceQuery} onChange={(event) => setReplaceQuery(event.target.value)} placeholder="Replace with..." className="mb-2 w-full rounded-md border px-3 py-2 text-sm" />
                  <div className="flex gap-2">
                    <button onClick={replaceOne} disabled={!results.length} className="flex-1 rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-700 disabled:opacity-50">Replace</button>
                    <button onClick={replaceAll} disabled={!results.length} className="flex-1 rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-700 disabled:opacity-50">Replace all</button>
                  </div>
                </div>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
