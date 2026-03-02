type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
};

export function SectionTitle(props: SectionTitleProps) {
  return (
    <header style={{
        marginBottom: "var(--space-8)",
        textAlign: props.center ? "center" : "left",
        maxWidth: props.center ? "700px" : "100%",
        marginLeft: props.center ? "auto" : "0",
        marginRight: props.center ? "auto" : "0"
    }}>
      {props.eyebrow ? (
        <span className="badge badge-primary" style={{ marginBottom: "var(--space-3)" }}>
          {props.eyebrow}
        </span>
      ) : null}
      <h2 style={{
          margin: "var(--space-3) 0 var(--space-3)",
          fontSize: "2.25rem",
          letterSpacing: "-0.02em"
      }}>
        {props.title}
      </h2>
      {props.subtitle ? (
        <p style={{
            margin: 0,
            color: "var(--c-ink-soft)",
            fontSize: "1.1rem"
        }}>
          {props.subtitle}
        </p>
      ) : null}
    </header>
  );
}
