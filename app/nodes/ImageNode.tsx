import type {
  DOMExportOutput,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { $applyNodeReplacement, DecoratorNode } from "lexical";
import type { JSX } from "react";

function getDownloadName(src: string, altText: string): string {
  const fallback = altText && altText !== "Image" ? altText : "image";

  if (fallback.includes(".")) return fallback;

  try {
    const extension = new URL(src).pathname.match(/\.[a-zA-Z0-9]+$/)?.[0];
    return `${fallback}${extension ?? ".png"}`;
  } catch {
    return `${fallback}.png`;
  }
}

function RenderedImage({ src, altText }: { src: string; altText: string }) {
  const downloadName = getDownloadName(src, altText);

  async function downloadImage() {
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error("Unable to download image");

      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = downloadName;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      const link = document.createElement("a");
      link.href = src;
      link.download = downloadName;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.click();
    }
  }

  return (
    <span className="group relative my-4 inline-block max-w-full">
      <img
        src={src}
        alt={altText}
        className="block h-auto max-w-full rounded-lg"
        draggable={false}
      />
      <button
        type="button"
        aria-label={`Download ${altText}`}
        title="Download image"
        className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-md bg-black/65 text-white opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-black/80 focus:opacity-100 group-hover:opacity-100"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void downloadImage();
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
          aria-hidden="true"
        >
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
      </button>
    </span>
  );
}

export type SerializedImageNode = Spread<
  {
    altText: string;
    src: string;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__altText, node.__key);
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    return $createImageNode({
      src: serializedNode.src,
      altText: serializedNode.altText,
    });
  }

  constructor(src: string, altText = "Image", key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__altText = altText;
  }

  exportJSON(): SerializedImageNode {
    return {
      ...super.exportJSON(),
      type: "image",
      version: 1,
      src: this.__src,
      altText: this.__altText,
    };
  }

  createDOM(): HTMLElement {
    return document.createElement("div");
  }

  updateDOM(): false {
    return false;
  }

  exportDOM(): DOMExportOutput {
    const image = document.createElement("img");
    image.setAttribute("src", this.__src);
    image.setAttribute("alt", this.__altText);
    return { element: image };
  }

  getTextContent(): string {
    return `![${this.__altText}](${this.__src})`;
  }

  decorate(): JSX.Element {
    return <RenderedImage src={this.__src} altText={this.__altText} />;
  }
}

export function $createImageNode({
  src,
  altText,
}: {
  src: string;
  altText?: string;
}): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, altText));
}

export function $isImageNode(
  node: LexicalNode | null | undefined
): node is ImageNode {
  return node instanceof ImageNode;
}
