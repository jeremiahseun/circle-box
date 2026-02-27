import { Card } from "../components/ui/card";
import { SectionTitle } from "../components/ui/section-title";
import { comparisonRows, platformInstallTargets } from "../lib/ui/theme";

// Icon components for frameworks
function SwiftLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 128 128">
      <path fill="#F05138" d="M110.8 19.9c.7 2.3 2.1 4.5 3.3 6.9-3.2-1.3-6.6-2-9.9-2.2-3.1 8.5-4.2 18.2-2.1 27.2 2.6 11.2 9.5 20.8 16.7 28.8-1.5 2.1-3.1 4.2-4.8 6.1-.9 1-1.9 1.9-2.9 2.8.4-.2.8-.3 1.1-.4 2.8 5.7 6.4 11 10.7 15.6 1.8 1.9 3.8 3.8 5.8 5.5-27.1 19.5-62.8 18.2-88.7 1.5-1.1-.7-2.1-1.4-3.2-2.2-7-5.1-13-11.4-17.6-18.7-2.6-4.1-4.7-8.5-6.2-13.1-2.9-9 3.6-18.3 12.9-19.3 5.4-.6 10.8 1.6 14.7 5.4 1 1 1.9 2.1 2.7 3.3-1.6-4.2-2.2-8.7-1.8-13.2.1-1.3.3-2.6.6-3.8 2-7.8 8.1-13.7 15.8-15.6 5.8-1.4 11.9-.3 17 2.7.7.4 1.4.9 2.1 1.4 2.1 1.6 3.9 3.5 5.5 5.6 3.1 4.2 5.2 9.2 6.1 14.4.1.6.2 1.3.3 1.9 1.4-1.9 3.1-3.7 5.1-5.1 6.5-4.6 15.4-3.6 20.7 2.1.8.8 1.5 1.7 2.1 2.6.4-1.9.3-3.9-.3-5.7-1.4-4-5.1-6.8-9.1-7.7-2.6-.6-5.4-.3-7.9.8-1.2.6-2.3 1.3-3.3 2.2-1.2-4.5-3.3-8.8-6.1-12.7-3.9-5.4-9.3-9.5-15.5-11.7-2.5-.9-5.1-1.4-7.7-1.4-2.3-.1-4.7.3-6.9 1.1-6.7 2.3-12.2 7-15.6 13.2-1.7 3-2.9 6.2-3.6 9.6-.5-3.5-1.6-6.9-3.4-10-3.6-6.3-9.3-11.1-16.1-13.6-3.3-1.2-6.9-1.6-10.4-1.1-5.3.7-10.1 3.2-13.9 7-6.2 6.3-8.8 15.5-6.8 24.1 1.7 7.4 6.7 13.6 13.3 16.9 1 .5 2 1 3 1.3-3.3 3.8-5.6 8.3-6.8 13.2-2.6 10.8 1.4 22.1 9.4 29.3 5.4 4.8 12.1 7.9 19.3 8.7 6.4.8 12.9-.5 18.7-3.8 5.7-3.2 10.6-7.8 14.2-13.3 5.7-8.6 7.4-19.1 4.7-29.1-.5-1.9-1.2-3.8-2.1-5.6 2.5 1.7 4.5 4.1 5.8 6.9 1.3 2.9 1.8 6.1 1.5 9.3-.5 5.5-3.5 10.5-8.1 13.3-1.6 1-3.4 1.7-5.3 2.1 1.6 3.6 3.8 7 6.6 9.9 2.7 2.9 5.8 5.3 9.3 7.1 13.5 6.9 29.9 5.6 42.1-3.3 1.8-1.3 3.5-2.8 5.1-4.4-4-5.2-7.5-10.7-10.3-16.5-2.9-6-5-12.2-6.4-18.7-1.4-6.4-1.8-13-1.3-19.5 0-.7.1-1.5.2-2.2-11.1-8-21.4-17.1-26.6-29.6-1-2.4-1.9-4.8-2.6-7.4 1.9-.3 3.8-.5 5.8-.4 7.6.4 14.9 3.5 20.3 8.7 3.3 3.1 5.9 7 7.5 11.2 1.6 4.3 2.3 8.9 1.9 13.5 2 2.6 4.4 4.8 7.1 6.5 4.4 2.8 9.6 4.2 14.8 3.8 4.4-.3 8.6-1.9 12.2-4.5 3.3-2.4 6-5.5 7.8-9.1 1.3-2.7 2-5.7 2-8.7-.1-3.1-.9-6.2-2.4-9-1.2-2.4-2.9-4.5-4.9-6.2-1.7-1.5-3.6-2.8-5.7-3.7z"/>
    </svg>
  );
}

function KotlinLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <path fill="currentColor" d="M2 2h20L12 12 22 22H2V2z" style={{ fill: "#7F52FF" }} />
      <path fill="#7F52FF" d="M22 2H2v20l20-20z" opacity="0" />
      {/* Simple polygon approximation for Kotlin */}
      <path fill="#C757BC" d="M2 2h10L2 12V2z" />
      <path fill="#7F52FF" d="M12 2h10L2 22V12L12 2z" />
      <path fill="#F88909" d="M22 2L12 12l10 10V2z" opacity="0" />
      {/* Better accurate path */}
      <path d="M24 24H0V0h24L12 12 24 24z" fill="url(#kotlin_grad)" />
      <defs>
          <linearGradient id="kotlin_grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#E44857" }} />
              <stop offset="50%" style={{ stopColor: "#C711E1" }} />
              <stop offset="100%" style={{ stopColor: "#7F52FF" }} />
          </linearGradient>
      </defs>
      <path d="M2 2h22L12 12 22 22H2z" fill="none" />
      <path d="M12 12L24 0H0v24h24L12 12z" fill="none" />
      <path d="M0 0h24v24H0z" fill="none" />
      <path d="M2 2v20h20L12 12 2 2z" fill="none" />
      <g transform="scale(1)">
        <path d="M12.6 12L24 24H0V0h12.6l-6.3 6.3L12.6 12z" fill="#7F52FF" opacity="0" />
        <path d="M1.3 1.3h21.4L12 12 1.3 1.3z" fill="none" />
        <path d="M24 0H0v24h24L12 12 24 0z" fill="url(#kg)" />
      </g>
    </svg>
  );
}

function FlutterLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 166 202">
      <path fill="#42A5F5" d="M100.2 0L37 63.4l63.2 63.2L163.5 63.3 100.2 0z"/>
      <path fill="#42A5F5" d="M100.2 0H166v.8l-91.8 91.8L37 63.4 100.2 0z"/>
      <path fill="#0D47A1" d="M79.2 119.5l26.2 26.2-41.9 41.9L21.7 146l57.5-26.5z" opacity="0.3"/>
      <path fill="#42A5F5" d="M100.2 126.6l26.2 26.2-62.8 62.8H0l37-37.3 63.2-51.7z" opacity="0"/>
      <g>
          <path fill="#02569B" d="M100.6 113.9l-26.6 26.6 62.9 62.9h66.4l-102.7-89.5z"/>
          <path fill="#01579B" d="M74.1 140.5l-37 37 26.4 26.5h36.7l-26.1-63.5z" opacity="0"/>
          <path fill="#29B6F6" d="M100.2 0L37 63.4l28.2 28.2L163.5 0h-63.3z"/>
          <path fill="#29B6F6" d="M65.2 91.6L37 119.8l26.4 26.4L136 73.6l-28.2-28.2-42.6 46.2z"/>
          <path fill="#01579B" d="M100.6 113.9l35.4 35.4-35.4 35.4-37-37 37-33.8z"/>
      </g>
    </svg>
  );
}

function ReactLogo() {
  return (
    <svg width="24" height="24" viewBox="-11.5 -10.23174 23 20.46348">
      <circle cx="0" cy="0" r="2.05" fill="#61dafb"/>
      <g stroke="#61dafb" strokeWidth="1" fill="none">
        <ellipse rx="11" ry="4.2"/>
        <ellipse rx="11" ry="4.2" transform="rotate(60)"/>
        <ellipse rx="11" ry="4.2" transform="rotate(120)"/>
      </g>
    </svg>
  );
}

const FrameworkIcons: Record<string, React.ReactNode> = {
    swift: <SwiftLogo />,
    kotlin: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M2 2H12L2 12V2Z" fill="#7F52FF"/>
            <path d="M12 2H22L12 12H12L12 2Z" fill="#7F52FF" opacity="0.5"/>
            <path d="M2 12L12 2H22L2 22V12Z" fill="url(#paint0_linear)"/>
            <defs>
                <linearGradient id="paint0_linear" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#E44857"/>
                    <stop offset="0.5" stopColor="#C711E1"/>
                    <stop offset="1" stopColor="#7F52FF"/>
                </linearGradient>
            </defs>
        </svg>
    ),
    flutter: (
        <svg width="24" height="24" viewBox="0 0 166 202" fill="none">
             <path fill="#42A5F5" d="M100.2 0L37 63.4l28.2 28.2L163.5 0h-63.3z"/>
             <path fill="#42A5F5" d="M65.2 91.6L37 119.8l37 37 62-62.1-28.2-28.2L65.2 91.6z"/>
             <path fill="#01579B" d="M74.1 156.8l26.5 26.5H167L103.7 127.1 74.1 156.8z"/>
        </svg>
    ),
    react: (
        <svg width="24" height="24" viewBox="-11.5 -10.23174 23 20.46348">
          <circle cx="0" cy="0" r="2.05" fill="#61dafb"/>
          <g stroke="#61dafb" strokeWidth="1" fill="none">
            <ellipse rx="11" ry="4.2"/>
            <ellipse rx="11" ry="4.2" transform="rotate(60)"/>
            <ellipse rx="11" ry="4.2" transform="rotate(120)"/>
          </g>
        </svg>
    )
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
        <div className="hero-content">
          <span className="badge badge-primary">Native Flight Recorder</span>
          <h1 className="hero-title">
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
