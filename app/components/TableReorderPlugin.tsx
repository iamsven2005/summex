"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
} from "lexical";
import {
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
} from "@lexical/table";
import { useEffect, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import { createPortal } from "react-dom";

const TABLE_REORDER_DATA = "application/x-doc-table-reorder";

type CellControls = {
  key: string;
  top: number;
  left: number;
};

export function TableReorderPlugin() {
  const [editor] = useLexicalComposerContext();
  const [cell, setCell] = useState<CellControls | null>(null);

  useEffect(() => {
    let activeRoot: HTMLElement | null = null;
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const cellElement = target.closest("td, th");
      if (!(cellElement instanceof HTMLElement)) return;

      let key: string | null = null;
      editor.read(() => {
        let node = $getNearestNodeFromDOMNode(cellElement);
        while (node && !$isTableCellNode(node)) node = node.getParent();
        if ($isTableCellNode(node)) key = node.getKey();
      });

      if (key) {
        const rect = cellElement.getBoundingClientRect();
        setCell({ key, top: rect.top, left: rect.left });
      }
    };

    const onDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes(TABLE_REORDER_DATA)) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const cellElement = target.closest("td, th");
      if (!(cellElement instanceof HTMLElement)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      activeRoot?.querySelectorAll(".lexical-table-drop-target").forEach((element) => {
        if (element !== cellElement) element.classList.remove("lexical-table-drop-target");
      });
      cellElement.classList.add("lexical-table-drop-target");
    };

    const onDrop = (event: DragEvent) => {
      const payload = event.dataTransfer?.getData(TABLE_REORDER_DATA);
      if (!payload) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const cellElement = target.closest("td, th");
      if (!(cellElement instanceof HTMLElement)) return;
      event.preventDefault();

      let targetKey: string | null = null;
      editor.read(() => {
        let node = $getNearestNodeFromDOMNode(cellElement);
        while (node && !$isTableCellNode(node)) node = node.getParent();
        if ($isTableCellNode(node)) targetKey = node.getKey();
      });

      try {
        const data = JSON.parse(payload) as { mode: "row" | "column"; sourceKey: string };
        if (targetKey) reorderTo(data.mode, data.sourceKey, targetKey);
      } finally {
        activeRoot?.querySelectorAll(".lexical-table-drop-target").forEach((element) =>
          element.classList.remove("lexical-table-drop-target")
        );
        setCell(null);
      }
    };

    return editor.registerRootListener((root, previousRoot) => {
      activeRoot = root;
      previousRoot?.removeEventListener("click", onClick);
      previousRoot?.removeEventListener("dragover", onDragOver);
      previousRoot?.removeEventListener("drop", onDrop);
      root?.addEventListener("click", onClick);
      root?.addEventListener("dragover", onDragOver);
      root?.addEventListener("drop", onDrop);
    });
  }, [editor]);

  function reorderTo(
    mode: "row" | "column",
    sourceKey: string,
    targetKey: string
  ) {
    editor.update(() => {
      const sourceCell = $getNodeByKey(sourceKey);
      const targetCell = $getNodeByKey(targetKey);
      if (!$isTableCellNode(sourceCell) || !$isTableCellNode(targetCell)) return;

      const sourceRow = sourceCell.getParent();
      const targetRow = targetCell.getParent();
      const sourceTable = sourceRow?.getParent();
      const targetTable = targetRow?.getParent();
      if (
        !$isTableRowNode(sourceRow) ||
        !$isTableRowNode(targetRow) ||
        !$isTableNode(sourceTable) ||
        !$isTableNode(targetTable) ||
        !sourceTable.is(targetTable)
      ) {
        return;
      }

      if (mode === "row") {
        if (sourceRow.is(targetRow)) return;
        const sourceIndex = sourceRow.getIndexWithinParent();
        const targetIndex = targetRow.getIndexWithinParent();
        sourceIndex < targetIndex
          ? targetRow.insertAfter(sourceRow)
          : targetRow.insertBefore(sourceRow);
        return;
      }

      const sourceIndex = sourceCell.getIndexWithinParent();
      const targetIndex = targetCell.getIndexWithinParent();
      if (sourceIndex === targetIndex) return;
      for (const row of sourceTable.getChildren()) {
        if (!$isTableRowNode(row)) continue;
        const movingCell = row.getChildAtIndex(sourceIndex);
        const destinationCell = row.getChildAtIndex(targetIndex);
        if (!$isTableCellNode(movingCell) || !$isTableCellNode(destinationCell)) continue;
        sourceIndex < targetIndex
          ? destinationCell.insertAfter(movingCell)
          : destinationCell.insertBefore(movingCell);
      }
    });
  }

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("[data-table-reorder]")) {
        return;
      }
      if (target instanceof HTMLElement && target.closest("td, th")) return;
      setCell(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function moveRow(direction: -1 | 1) {
    if (!cell) return;
    editor.update(() => {
      const cellNode = $getNodeByKey(cell.key);
      const row = cellNode?.getParent();
      if (!$isTableRowNode(row)) return;
      const sibling = direction < 0 ? row.getPreviousSibling() : row.getNextSibling();
      if (!$isTableRowNode(sibling)) return;
      direction < 0 ? sibling.insertBefore(row) : sibling.insertAfter(row);
    });
    setCell(null);
  }

  function moveColumn(direction: -1 | 1) {
    if (!cell) return;
    editor.update(() => {
      const cellNode = $getNodeByKey(cell.key);
      const row = cellNode?.getParent();
      const table = row?.getParent();
      if (!$isTableCellNode(cellNode) || !$isTableRowNode(row) || !$isTableNode(table)) {
        return;
      }

      const columnIndex = cellNode.getIndexWithinParent();
      for (const tableRow of table.getChildren()) {
        if (!$isTableRowNode(tableRow)) continue;
        const columnCell = tableRow.getChildAtIndex(columnIndex);
        if (!$isTableCellNode(columnCell)) continue;
        const sibling =
          direction < 0
            ? columnCell.getPreviousSibling()
            : columnCell.getNextSibling();
        if (!$isTableCellNode(sibling)) continue;
        direction < 0
          ? sibling.insertBefore(columnCell)
          : sibling.insertAfter(columnCell);
      }
    });
    setCell(null);
  }

  if (!cell) return null;

  return createPortal(
    <div
      data-table-reorder
      className="fixed z-[70] flex -translate-y-full gap-0.5 rounded-md border border-gray-200 bg-white p-1 shadow-md"
      style={{ top: cell.top - 4, left: cell.left }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <DragHandle mode="row" sourceKey={cell.key}>↕</DragHandle>
      <ReorderButton label="Move row up" onClick={() => moveRow(-1)}>↑</ReorderButton>
      <ReorderButton label="Move row down" onClick={() => moveRow(1)}>↓</ReorderButton>
      <span className="mx-0.5 w-px bg-gray-200" />
      <DragHandle mode="column" sourceKey={cell.key}>↔</DragHandle>
      <ReorderButton label="Move column left" onClick={() => moveColumn(-1)}>←</ReorderButton>
      <ReorderButton label="Move column right" onClick={() => moveColumn(1)}>→</ReorderButton>
    </div>,
    document.body
  );
}

function DragHandle({
  mode,
  sourceKey,
  children,
}: {
  mode: "row" | "column";
  sourceKey: string;
  children: string;
}) {
  const label = `Drag to reorder ${mode}`;
  return (
    <button
      type="button"
      draggable
      title={label}
      aria-label={label}
      onDragStart={(event: ReactDragEvent<HTMLButtonElement>) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(
          TABLE_REORDER_DATA,
          JSON.stringify({ mode, sourceKey })
        );
      }}
      className="flex size-7 cursor-grab items-center justify-center rounded bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200 active:cursor-grabbing"
    >
      {children}
    </button>
  );
}

function ReorderButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    >
      {children}
    </button>
  );
}
