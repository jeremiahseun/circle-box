type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function SectionTitle(props: SectionTitleProps) {
  return (
    <header style={{ marginBottom: 14 }}>
      {props.eyebrow ? <span className="badge">{props.eyebrow}</span> : null}
      <h2 style={{ margin: "10px 0 8px" }}>{props.title}</h2>
      {props.subtitle ? <p style={{ margin: 0, color: "var(--ink-soft)" }}>{props.subtitle}</p> : null}
    </header>
  );
}
