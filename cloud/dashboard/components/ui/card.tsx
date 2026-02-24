import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card(props: CardProps) {
  const className = props.className ? `panel ${props.className}` : "panel";
  return <div className={className}>{props.children}</div>;
}
