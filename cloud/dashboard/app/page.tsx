import { Card } from "../components/ui/card";
import { SectionTitle } from "../components/ui/section-title";
import { comparisonRows, platformInstallTargets } from "../lib/ui/theme";

const FrameworkIcons: Record<string, React.ReactNode> = {
    swift: <img src="https://upload.wikimedia.org/wikipedia/commons/9/9d/Swift_logo.svg" alt="Swift" width="24" height="24" />,
    kotlin: <img src="https://upload.wikimedia.org/wikipedia/commons/7/74/Kotlin_Icon.png" alt="Kotlin" width="24" height="24" />,
    flutter: <img src="https://upload.wikimedia.org/wikipedia/commons/1/17/Google-flutter-logo.png" alt="Flutter" width="24" height="24" />,
    react: <img src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" alt="React Native" width="24" height="24" />
};

const workflowSteps = [
  {
    title: "Capture",
    body: "Native ring buffer records thermal, memory, battery, connectivity, lifecycle, permission, and jank signals with fixed memory.",
  },
  {
    title: "Persist",
    body: "Crash-time prehook writes pending report atomically, then recovers on next app start for deterministic export flow.",
  },
  {
    title: "Export",
    body: "Generate JSON, CSV, gzip, and summary artifacts. Keep full forensic payloads and lightweight operational snapshots.",
  },
  {
    title: "Route",
    body: "Optional cloud upload (Worker + R2 + regional Supabase) and optional Sentry/PostHog forwarding via companion adapters.",
  },
];

export default function HomePage() {
  return (
    <div style={{ display: "grid", gap: 64 }}>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content" style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "flex-start" }}>
          <span className="badge badge-primary">Native Flight Recorder</span>
          <h1 className="hero-title" style={{ marginTop: "8px" }}>
            Crash observability that starts <span style={{ color: "var(--c-accent)" }}>before the crash.</span>
          </h1>
          <p className="hero-lead">
            CircleBox captures pre-crash mobile context with fixed-memory ring buffers.
            Designed for high-scale apps where every byte and millisecond matters.
          </p>

          <div className="hero-actions">
            <a href="/docs/getting-started" className="btn btn-primary btn-lg">Start Integrating</a>
            <a href="/docs/release-matrix" className="btn btn-lg">View Install Matrix</a>
          </div>

          <div className="hero-kpis">
            <div className="kpi-item">
              <strong>&lt;256KB</strong>
              <span>Memory Overhead</span>
            </div>
            <div className="kpi-item">
              <strong>Zero</strong>
              <span>Network Default</span>
            </div>
            <div className="kpi-item">
              <strong>50+</strong>
              <span>Events Buffered</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <Card className="timeline-card">
            <div className="timeline-header">
              <h3>Flight Recorder Stream</h3>
              <span className="live-indicator">● LIVE</span>
            </div>
            <div className="timeline-mini">
              <div className="timeline-row">
                <span className="seq">247</span>
                <span className="event">thermal_state_changed</span>
                <span className="tag tag-warn">serious</span>
              </div>
              <div className="timeline-row">
                <span className="seq">248</span>
                <span className="event">memory_pressure</span>
                <span className="tag tag-warn">warn</span>
              </div>
              <div className="timeline-row">
                <span className="seq">249</span>
                <span className="event">network_transition</span>
                <span className="tag">wifi → none</span>
              </div>
              <div className="timeline-row highlight">
                <span className="seq">250</span>
                <span className="event">native_exception_prehook</span>
                <span className="tag tag-danger">fatal</span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Install Targets */}
      <section>
        <SectionTitle
          eyebrow="Platform Support"
          title="Release-ready packages"
          subtitle="Use CircleBox standalone or compose with your existing observability stack."
          center
        />
        <div className="install-grid">
          {platformInstallTargets.map((target) => (
            <a key={target.label} href={target.path} className="install-item">
              <div className="install-icon-wrapper">
                  {/* @ts-ignore */}
                  {target.icon && FrameworkIcons[target.icon]}
              </div>
              <div>
                <strong>{target.label}</strong>
                {/* @ts-ignore */}
                {target.sub && <span style={{ display: "block", fontSize: "0.75rem", color: "var(--c-ink-soft)" }}>{target.sub}</span>}
              </div>
            </a>
          ))}
        </div>
        {/* Style moved to CSS or inline styles to avoid styled-jsx issues in server component */}
        <style dangerouslySetInnerHTML={{__html: `
            .install-icon-wrapper {
                width: 48px;
                height: 48px;
                background: var(--c-bg);
                border-radius: var(--radius-sm);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .hero-content {
               padding-right: 32px;
            }
            .hero-title {
               margin-bottom: 0 !important;
            }
        `}} />
      </section>

      {/* How it Works */}
      <section className="bg-subtle-section">
        <SectionTitle
          eyebrow="Architecture"
          title="Native-first crash context pipeline"
          subtitle="Designed for low bandwidth and low overhead production operation."
        />
        <div className="grid-4">
          {workflowSteps.map((step, index) => (
            <article key={step.title} className="flow-step">
              <span className="step-number">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section>
        <Card>
          <div style={{ padding: "32px" }}>
            <SectionTitle
              eyebrow="Why CircleBox"
              title="Focus on crash-path reality"
              subtitle="Optimized for context depth, not just exception counting."
            />
            <div className="table-wrap">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Capability</th>
                    <th>CircleBox</th>
                    <th>Generic Crash Tools</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.capability}>
                      <td>{row.capability}</td>
                      <td className="check-col">
                        <span className="check-icon">✓</span> {row.circlebox}
                      </td>
                      <td className="text-muted">{row.genericTools}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </section>

      {/* Paths */}
      <section>
        <SectionTitle
            eyebrow="Deployment Options"
            title="Choose your integration path"
            center
        />
        <div className="grid-3">
          <Card className="path-card">
            <h3>Core-only Path</h3>
            <p>
              Local exports, no backend requirement. Immediate mobile crash context for QA and debugging.
            </p>
            <a href="/docs/choose-path" className="btn btn-sm">Read More</a>
          </Card>
          <Card className="path-card featured">
            <div className="featured-label">Recommended</div>
            <h3>Cloud Path</h3>
            <p>
              Managed ingest, regional routing, signed raw downloads, and searchable crash timelines.
            </p>
            <a href="/docs/cloud-quickstart" className="btn btn-primary btn-sm">Start Cloud</a>
          </Card>
          <Card className="path-card">
            <h3>Adapter Path</h3>
            <p>
              Forward CircleBox narratives into Sentry/PostHog where teams already run alerting.
            </p>
            <a href="/docs/integrations-sentry-posthog" className="btn btn-sm">View Integrations</a>
          </Card>
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="cta-section">
          <h2>Ready to capture the full story?</h2>
          <p>Get started with CircleBox today. Open source core, powerful cloud.</p>
          <div className="cta-row">
              <a href="/signup" className="btn btn-primary btn-lg">Create Free Account</a>
              <a href="/docs" className="btn btn-lg">Read Documentation</a>
          </div>
      </section>
    </div>
  );
}
