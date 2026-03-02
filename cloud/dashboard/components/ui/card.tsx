import type { ReactNode, CSSProperties } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function Card(props: CardProps) {
  // Allow custom className to be appended, but ensure base styles
  const baseClass = "panel";
  const className = props.className ? `${baseClass} ${props.className}` : baseClass;

  return (
    <div className={className} style={{
      background: "var(--c-surface)",
      border: "1px solid var(--c-border)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-md)",
      ...props.style
    }}>
      {props.children}
    </div>
  );
}
