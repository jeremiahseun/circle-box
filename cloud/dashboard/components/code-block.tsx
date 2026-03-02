"use client";

import { useState } from "react";

export function CodeBlock({ children, className }: { children: React.ReactNode, className?: string }) {
  const [copied, setCopied] = useState(false);

  // Extract text content from children for copying
  const getText = () => {
    // This is a naive extraction; ideally, we pass the raw code string as a prop.
    // However, MDX often passes structured children.
    // Let's assume for now `children` is a string or has .props.children that is a string.
    let text = "";
    try {
        if (typeof children === "string") {
            text = children;
        } else if (typeof children === "object" && children !== null && "props" in children) {
             // @ts-ignore
            text = children.props.children;
        }
    } catch (e) {
        text = "";
    }
    return text;
  };

  const handleCopy = () => {
    const text = getText();
    if (text) {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  // Language extraction
  const language = className?.replace(/language-/, "") || "text";

  return (
    <div className="code-block-wrapper">
      <div className="code-header">
        <span style={{ textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, fontSize: "0.7rem", color: "#94a3b8" }}>
            {language}
        </span>
        <button onClick={handleCopy} className="copy-btn" aria-label="Copy code">
            {copied ? (
                <span className="copy-success">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Copied
                </span>
            ) : (
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copy
                </span>
            )}
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <pre className={className} style={{ margin: 0, padding: "16px", background: "transparent" }}>
            {children}
        </pre>
      </div>
      <style jsx>{`
        .code-block-wrapper {
            margin: var(--space-6) 0;
            border-radius: var(--radius-md);
            overflow: hidden;
            border: 1px solid var(--c-border);
            background: #0f172a; /* Slate 900 */
            box-shadow: var(--shadow-md);
        }
        .code-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 16px;
            background: #1e293b; /* Slate 800 */
            border-bottom: 1px solid #334155;
        }
        .copy-btn {
            background: transparent;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            font-size: 0.75rem;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s;
        }
        .copy-btn:hover {
            color: white;
            background: rgba(255,255,255,0.1);
        }
        .copy-success {
            color: #10b981;
            display: flex;
            align-items: center;
            gap: 4px;
        }
      `}</style>
    </div>
  );
}
