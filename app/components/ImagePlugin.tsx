"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $getRoot,
  $getSelection,
  $insertNodes,
  COMMAND_PRIORITY_HIGH,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
  PASTE_COMMAND,
} from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";
import { $createImageNode } from "../nodes/ImageNode";
import { OPEN_IMAGE_UPLOAD_COMMAND } from "../commands/image";

function getImageFiles(files: FileList | null): File[] {
  return files
    ? Array.from(files).filter((file) => file.type.startsWith("image/"))
    : [];
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read image"));
    reader.readAsDataURL(file);
  });
}

export function ImagePlugin() {
  const [editor] = useLexicalComposerContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const insertImageSources = useCallback(
    (images: Array<{ src: string; altText?: string }>) => {
      editor.update(() => {
        const nodes = images.map((image) => $createImageNode(image));

        if ($getSelection()) {
          $insertNodes(nodes);
        } else {
          $getRoot().append(...nodes);
        }
      });
    },
    [editor]
  );

  const insertImages = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      try {
        const images = await Promise.all(
          files.map(async (file) => ({
            src: await fileToDataUrl(file),
            altText: file.name || "Image",
          }))
        );

        insertImageSources(images);
        setError(null);
      } catch {
        setError("The image could not be read.");
      }
    },
    [insertImageSources]
  );

  const insertImageUrl = useCallback(() => {
    const value = imageUrl.trim();

    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error("Unsupported protocol");
      }

      insertImageSources([{ src: url.toString(), altText: "Linked image" }]);
      setImageUrl("");
      setShowLinkInput(false);
      setError(null);
    } catch {
      setError("Enter a valid http or https image URL.");
    }
  }, [imageUrl, insertImageSources]);

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        OPEN_IMAGE_UPLOAD_COMMAND,
        () => {
          inputRef.current?.click();
          return true;
        },
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand(
        DRAGOVER_COMMAND,
        (event: DragEvent) => {
          if (getImageFiles(event.dataTransfer?.files ?? null).length === 0) {
            return false;
          }

          event.preventDefault();
          return true;
        },
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand(
        PASTE_COMMAND,
        (event: ClipboardEvent) => {
          const files = getImageFiles(event.clipboardData?.files ?? null);
          if (files.length === 0) return false;

          event.preventDefault();
          void insertImages(files);
          return true;
        },
        COMMAND_PRIORITY_HIGH
      ),
      editor.registerCommand(
        DROP_COMMAND,
        (event: DragEvent) => {
          const files = getImageFiles(event.dataTransfer?.files ?? null);
          if (files.length === 0) return false;

          event.preventDefault();
          editor.focus();
          void insertImages(files);
          return true;
        },
        COMMAND_PRIORITY_HIGH
      )
    );
  }, [editor, insertImages]);

  return (
    <div className="absolute right-0 top-0 z-10 flex flex-wrap items-center justify-end gap-2">
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          void insertImages(getImageFiles(event.target.files));
          event.target.value = "";
        }}
      />
      <button
        type="button"
        className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 shadow-sm hover:bg-gray-50"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => inputRef.current?.click()}
      >
        Upload image
      </button>
      <button
        type="button"
        className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 shadow-sm hover:bg-gray-50"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setShowLinkInput((visible) => !visible);
          setError(null);
        }}
      >
        Image link
      </button>
      {showLinkInput ? (
        <form
          className="flex w-full justify-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            insertImageUrl();
          }}
        >
          <input
            type="url"
            autoFocus
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-72 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!imageUrl.trim()}
            className="rounded-md bg-gray-900 px-2.5 py-1.5 text-xs text-white disabled:opacity-50"
          >
            Add
          </button>
        </form>
      ) : null}
    </div>
  );
}
