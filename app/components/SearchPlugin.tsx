"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, TextNode } from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SearchIcon } from "../icons/SearchIcon";

interface SearchResult {
  node: TextNode;
  offset: number;
  length: number;
  text: string;
}

export function SearchPlugin() {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [showReplace, setShowReplace] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search through all nodes for matching text
  const performSearch = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setResults([]);
        setCurrentResultIndex(0);
        return;
      }

      editor.read(() => {
        const root = $getRoot();
        const matches: SearchResult[] = [];
        const lowerQuery = query.toLowerCase();

        const traverse = (node: any) => {
          if (node instanceof TextNode) {
            const text = node.getTextContent();
            const lowerText = text.toLowerCase();
            let index = 0;

            while ((index = lowerText.indexOf(lowerQuery, index)) !== -1) {
              matches.push({
                node,
                offset: index,
                length: query.length,
                text: text.substring(index, index + query.length),
              });
              index += query.length;
            }
          }

          const children = node.getChildren?.();
          if (children) {
            children.forEach(traverse);
          }
        };

        traverse(root);
        setResults(matches);
        setCurrentResultIndex(0);
      });
    },
    [editor]
  );

  // Replace current result
  const replaceOne = useCallback(() => {
    if (results.length === 0 || !replaceQuery) return;

    const result = results[currentResultIndex];
    editor.update(() => {
      const text = result.node.getTextContent();
      const before = text.substring(0, result.offset);
      const after = text.substring(result.offset + result.length);
      result.node.setTextContent(before + replaceQuery + after);
    });

    // Refresh search after replacement
    performSearch(searchQuery);
  }, [results, currentResultIndex, replaceQuery, searchQuery, editor, performSearch]);

  // Replace all occurrences
  const replaceAll = useCallback(() => {
    if (results.length === 0 || !replaceQuery) return;

    editor.update(() => {
      const resultsCopy = [...results].reverse(); // reverse to avoid offset issues
      resultsCopy.forEach((result) => {
        const text = result.node.getTextContent();
        const before = text.substring(0, result.offset);
        const after = text.substring(result.offset + result.length);
        result.node.setTextContent(before + replaceQuery + after);
      });
    });

    // Refresh search after replacement
    performSearch(searchQuery);
  }, [results, replaceQuery, searchQuery, editor, performSearch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+F or Ctrl+F to open search
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setOpen(true);
      }
      // Escape to close search
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
      // Enter to navigate to next result
      if (e.key === "Enter" && open && !showReplace) {
        e.preventDefault();
        setCurrentResultIndex((i) => (i + 1) % (results.length || 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, showReplace, results.length]);

  // Focus search input when opened
  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed top-20 right-6 z-40 w-96 rounded-lg border border-gray-300 bg-white shadow-lg p-4">
      {/* Search Input */}
      <div className="mb-3">
        <div className="flex gap-2 mb-2">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              performSearch(e.target.value);
            }}
            placeholder="Find..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={() => setOpen(false)}
            className="px-3 py-2 text-sm font-medium hover:bg-gray-100 rounded-md"
          >
            ✕
          </button>
        </div>

        {/* Result counter */}
        {results.length > 0 && (
          <div className="text-xs text-gray-600 mb-2">
            {currentResultIndex + 1} of {results.length} results
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      {results.length > 0 && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={() =>
              setCurrentResultIndex((i) => (i - 1 + results.length) % results.length)
            }
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
          >
            ↑ Previous
          </button>
          <button
            onClick={() => setCurrentResultIndex((i) => (i + 1) % results.length)}
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
          >
            Next ↓
          </button>
        </div>
      )}

      {/* Replace toggle */}
      <div className="mb-3">
        <button
          onClick={() => setShowReplace(!showReplace)}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          {showReplace ? "Hide Replace" : "Show Replace"}
        </button>
      </div>

      {/* Replace Input */}
      {showReplace && (
        <div className="mb-3 pt-3 border-t border-gray-200">
          <input
            type="text"
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            placeholder="Replace with..."
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            <button
              onClick={replaceOne}
              disabled={results.length === 0}
              className="flex-1 px-2 py-1 text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Replace
            </button>
            <button
              onClick={replaceAll}
              disabled={results.length === 0}
              className="flex-1 px-2 py-1 text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Replace All
            </button>
          </div>
        </div>
      )}

      {/* No results message */}
      {searchQuery.trim() && results.length === 0 && (
        <div className="text-xs text-gray-500">No matches found</div>
      )}
    </div>,
    document.body
  );
}
