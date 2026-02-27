import { Card } from "../components/ui/card";
import { SectionTitle } from "../components/ui/section-title";
import { comparisonRows, platformInstallTargets } from "../lib/ui/theme";

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
    <div style={{ display: "grid", gap: 24 }}>
      <section className="hero hero-pro">
        <Card className="hero-copy">
          <div style={{ padding: 24 }}>
            <span className="badge">Open Core + Cloud</span>
            <h1>Crash observability that starts before the crash.</h1>
            <p>
              CircleBox is the native flight recorder for mobile SDKs. Capture low-level runtime context, preserve the
              final crash timeline, and investigate with raw reports and searchable dashboards.
            </p>
            <div className="cta-row">
              <a href="/docs/getting-started" className="btn btn-primary">Get Started</a>
              <a href="/docs/release-matrix" className="btn">Install Matrix</a>
              <a href="/signup" className="btn">Create Account</a>
              <a href="/pricing" className="btn">Pricing</a>
              <a href="/login" className="btn">Open Cloud App</a>
            </div>
            <div className="hero-kpis">
              <span><strong>&lt;256KB</strong> target memory overhead</span>
              <span><strong>0 network</strong> by default in core SDK</span>
              <span><strong>50+</strong> recent events with fixed ring buffer</span>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: 22 }}>
            <SectionTitle
              eyebrow="Timeline Preview"
              title="Where stack traces end, CircleBox begins"
              subtitle="Pre-crash context stitched into one ordered narrative."
            />
            <div className="timeline-mini">
              <div><span>seq 247</span><em>thermal_state_changed</em><small>serious</small></div>
              <div><span>seq 248</span><em>memory_pressure</em><small>warn</small></div>
              <div><span>seq 249</span><em>network_transition</em><small>wifi → none</small></div>
              <div><span>seq 250</span><em>native_exception_prehook</em><small>fatal</small></div>
            </div>
            <p style={{ marginBottom: 0, color: "var(--ink-soft)" }}>
              Export source and capture reason are embedded for deterministic triage and pipeline routing.
            </p>
          </div>
        </Card>
      </section>

      <Card>
        <div style={{ padding: 22 }}>
          <SectionTitle
            eyebrow="Install Targets"
            title="Release-ready packages you can ship today"
            subtitle="Use CircleBox standalone or compose with your existing observability stack."
          />
          <div className="install-grid">
            {platformInstallTargets.map((target) => (
              <a key={target.label} href={target.path} className="install-item">
                <strong>{target.label}</strong>
                <small>View quickstart</small>
              </a>
            ))}
          </div>
          <p style={{ marginTop: 14, color: "var(--ink-soft)" }}>
            Sentry/PostHog support is optional through companion adapters. Core SDKs remain vendor-neutral.
          </p>
        </div>
      </Card>

      <Card>
        <div style={{ padding: 22 }}>
          <SectionTitle
            eyebrow="How It Works"
            title="Native-first crash context pipeline"
            subtitle="Designed for low bandwidth and low overhead production operation."
          />
          <div className="grid-4">
            {workflowSteps.map((step, index) => (
              <article key={step.title} className="flow-step">
                <span>{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ padding: 22 }}>
          <SectionTitle
            eyebrow="Capability Comparison"
            title="Focus on crash-path reality"
            subtitle="CircleBox is optimized for context depth, not just exception counting."
          />
          <div className="table-wrap">
            <table>
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
                    <td>{row.circlebox}</td>
                    <td>{row.genericTools}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <section className="grid-3">
        <Card>
          <div style={{ padding: 18 }}>
            <h3 style={{ marginTop: 0 }}>Core-only Path</h3>
            <p style={{ color: "var(--ink-soft)" }}>
              Local exports, no backend requirement, immediate mobile crash context for QA and production debugging.
            </p>
            <a href="/docs/choose-path">Choose path</a>
          </div>
        </Card>
        <Card>
          <div style={{ padding: 18 }}>
            <h3 style={{ marginTop: 0 }}>Cloud Path</h3>
            <p style={{ color: "var(--ink-soft)" }}>
              Managed ingest, regional routing, signed raw downloads, and searchable crash timelines.
            </p>
            <a href="/docs/cloud-quickstart">Cloud quickstart</a>
          </div>
        </Card>
        <Card>
          <div style={{ padding: 18 }}>
            <h3 style={{ marginTop: 0 }}>Adapter Path</h3>
            <p style={{ color: "var(--ink-soft)" }}>
              Forward CircleBox narratives into Sentry/PostHog where teams already run alerting and analytics.
            </p>
            <a href="/docs/integrations-sentry-posthog">Integration guide</a>
          </div>
        </Card>
      </section>
    </div>
  );
}
