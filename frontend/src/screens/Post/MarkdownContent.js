import React from "react";
import { createRoot } from "react-dom/client";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import "./Post.css";

function getCodeInlineStyle(postType) {
  switch (postType) {
    case "snippet":
      return {
        background: "#2a0c4a",
        color: "#ddc4fcff",
        padding: "2px 6px",
        borderRadius: "5px",
        fontSize: "0.97em",
        fontFamily: "inherit",
        fontWeight: 500,
        display: "inline",
        whiteSpace: "nowrap",
      };
    case "meme":
      return {
        background: "#3d2e0f",
        color: "#f8e3b7ff",
        padding: "2px 6px",
        borderRadius: "5px",
        fontSize: "0.97em",
        fontFamily: "inherit",
        fontWeight: 500,
        display: "inline",
        whiteSpace: "nowrap",
      };
    case "tutorial":
      return {
        background: "#0d3d12",
        color: "#bbf5c7ff",
        padding: "2px 6px",
        borderRadius: "5px",
        fontSize: "0.97em",
        fontFamily: "inherit",
        fontWeight: 500,
        display: "inline",
        whiteSpace: "nowrap",
      };
    case "research":
      return {
        background: "#5a0f0f",
        color: "#f1c2c2ff",
        padding: "2px 6px",
        borderRadius: "5px",
        fontSize: "0.97em",
        fontFamily: "inherit",
        fontWeight: 500,
        display: "inline",
        whiteSpace: "nowrap",
      };
    case "question":
      return {
        background: "#0d3d5a",
        color: "#c0dff7ff",
        padding: "2px 6px",
        borderRadius: "5px",
        fontSize: "0.97em",
        fontFamily: "inherit",
        fontWeight: 500,
        display: "inline",
        whiteSpace: "nowrap",
      };
    default:
      return {
        background: "#23222a",
        color: "#cabcf7ff",
        padding: "2px 6px",
        borderRadius: "5px",
        fontSize: "0.97em",
        fontFamily: "inherit",
        fontWeight: 500,
        display: "inline",
        whiteSpace: "nowrap",
      };
  }
}

export function MarkdownContent({ content, postType }) {
  return (
    <ReactMarkdown
      components={{
        blockquote({ node, ...props }) {
          const onlyCode =
            node.children &&
            node.children.length === 1 &&
            node.children[0].type === "element" &&
            (node.children[0].tagName === "pre" ||
              node.children[0].tagName === "code");

          if (onlyCode) {
            return (
              <blockquote className="quote-code">{props.children}</blockquote>
            );
          }

          return <blockquote {...props} />;
        },
        p({ node, children, ...props }) {
          const isOnlyInlineCode =
            node.children &&
            node.children.length === 1 &&
            node.children[0].type === "element" &&
            node.children[0].tagName === "code";

          return isOnlyInlineCode ? (
            <span {...props}>{children}</span>
          ) : (
            <p {...props}>{children}</p>
          );
        },
        code({ node, className, children, inline, ...props }) {
          const isInline =
            inline ||
            (node &&
              node.tagName === "code" &&
              !className?.includes("language-"));

          if (isInline) {
            return (
              <code
                className={className}
                style={getCodeInlineStyle(postType)}
                {...props}
              >
                {children}
              </code>
            );
          }

          const match = /language-(\w+)/.exec(className || "");
          return (
            <SyntaxHighlighter
              style={oneDark}
              language={match ? match[1] : "plaintext"}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          );
        },
      }}
    >
      {content || ""}
    </ReactMarkdown>
  );
}

export function mountMarkdownPreview(
  editorInstance,
  { getPostType = () => undefined } = {}
) {
  const previewElement = editorInstance?.preview?.[0];
  if (!previewElement) return null;

  const editorMdPreview = previewElement.querySelector(
    ".editormd-preview-container"
  );
  if (editorMdPreview) editorMdPreview.style.display = "none";

  const host = document.createElement("div");
  host.className = "codula-markdown-preview post-content";
  previewElement.appendChild(host);

  const root = createRoot(host);
  let mounted = true;
  const render = (markdown = "") => {
    if (!mounted) return;
    root.render(
      <MarkdownContent content={markdown} postType={getPostType()} />
    );
  };

  render(editorInstance.getMarkdown?.() || "");

  return {
    render,
    unmount() {
      if (!mounted) return;
      mounted = false;
      root.unmount();
      host.remove();
      if (editorMdPreview) editorMdPreview.style.removeProperty("display");
    },
  };
}

export default MarkdownContent;
