import { Card } from "../../components/ui/card";
import { SectionTitle } from "../../components/ui/section-title";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    subtitle: "Best for solo developers and early validation",
    cta: "Get Started Free",
    ctaHref: "/signup",
    featured: false,
    bullets: [
      "5,000 reports / month",
      "Single project",
      "Core SDK + local export + optional cloud ingest",
      "US region",
      "Community support",
    ],
  },
  {
    name: "Starter",
    price: "$19",
    period: "/ month + usage",
    subtitle: "Small teams shipping production apps",
    cta: "Start Free Trial",
    ctaHref: "/signup",
    featured: true,
    bullets: [
      "Up to 100,000 reports / month",
      "Multiple projects",
      "US + EU regional ingest",
      "Dashboard + raw report downloads",
      "Sentry / PostHog adapters",
      "Email support",
    ],
  },
  {
    name: "Organization",
    price: "Custom",
    period: "",
    subtitle: "Compliance, higher volume, and custom controls",
    cta: "Contact Sales",
    ctaHref: "mailto:sales@circlebox.dev",
    featured: false,
    bullets: [
      "Custom report / storage limits",
      "Security and compliance controls",
      "Custom onboarding and support",
      "Contracted SLA",
      "HIPAA / GDPR-aligned workflows",
    ],
  },
];

const featureRows = [
  { feature: "Monthly reports", free: "5,000", starter: "100,000", org: "Custom" },
  { feature: "Projects", free: "1", starter: "Unlimited", org: "Unlimited" },
  { feature: "Data regions", free: "US", starter: "US + EU", org: "US + EU + custom" },
  { feature: "Raw report downloads", free: "✓", starter: "✓", org: "✓" },
  { feature: "Sentry / PostHog adapters", free: "–", starter: "✓", org: "✓" },
  { feature: "Team members", free: "1", starter: "Unlimited", org: "Unlimited" },
  { feature: "Retention (raw)", free: "7 days", starter: "30 days", org: "Custom" },
  { feature: "Retention (aggregates)", free: "30 days", starter: "180 days", org: "Custom" },
  { feature: "AI root-cause hints", free: "–", starter: "–", org: "✓" },
  { feature: "SLA", free: "–", starter: "–", org: "Custom" },
  { feature: "Support", free: "Community", starter: "Email", org: "Dedicated" },
];

export default function PricingPage() {
  return (
    <div style={{ display: "grid", gap: 64 }}>
      {/* Header */}
      <section style={{ textAlign: "center" }}>
        <SectionTitle
          eyebrow="Pricing"
          title="Simple for developers, scalable for teams"
          subtitle="Use CircleBox offline-only, with CircleBox cloud, or with your own backend. No hidden fees."
          center
        />
      </section>

      {/* Plan Cards */}
      <section>
        <div className="pricing-grid">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`pricing-card ${plan.featured ? "pricing-card--featured" : ""}`}
            >
              {plan.featured && (
                <div className="pricing-featured-badge">Most Popular</div>
              )}
              <div className="pricing-card-header">
                <h3 className="pricing-plan-name">{plan.name}</h3>
                <div className="pricing-price-row">
                  <span className="pricing-price">{plan.price}</span>
                  {plan.period && <span className="pricing-period">{plan.period}</span>}
                </div>
                <p className="pricing-subtitle">{plan.subtitle}</p>
              </div>

              <ul className="pricing-bullets">
                {plan.bullets.map((bullet) => (
                  <li key={bullet} className="pricing-bullet">
                    <span className="bullet-check">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>

              <div className="pricing-cta">
                <a
                  href={plan.ctaHref}
                  className={`btn ${plan.featured ? "btn-primary" : ""} pricing-btn`}
                >
                  {plan.cta}
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section>
        <Card>
          <div style={{ padding: "32px" }}>
            <SectionTitle
              eyebrow="Compare Plans"
              title="What&apos;s included"
              subtitle="A full breakdown of features across all plans."
            />
            <div className="table-wrap">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th style={{ width: "40%" }}>Feature</th>
                    <th style={{ textAlign: "center" }}>Free</th>
                    <th style={{ textAlign: "center", background: "var(--c-accent-subtle)" }}>Starter</th>
                    <th style={{ textAlign: "center" }}>Organization</th>
                  </tr>
                </thead>
                <tbody>
                  {featureRows.map((row) => (
                    <tr key={row.feature}>
                      <td style={{ fontWeight: 500 }}>{row.feature}</td>
                      <td style={{ textAlign: "center", color: "var(--c-ink-soft)" }}>{row.free}</td>
                      <td style={{
                        textAlign: "center",
                        background: "rgba(16,185,129,0.03)",
                        fontWeight: row.starter === "✓" ? 700 : undefined,
                        color: row.starter === "–" ? "var(--c-ink-faint)" : row.starter === "✓" ? "var(--c-accent)" : undefined,
                      }}>
                        {row.starter}
                      </td>
                      <td style={{ textAlign: "center", color: "var(--c-ink-soft)" }}>{row.org}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </section>

      {/* Customer Modes */}
      <section>
        <SectionTitle
          eyebrow="Deployment Modes"
          title="Use it your way"
          center
        />
        <div className="grid-3">
          <Card>
            <div style={{ padding: "24px" }}>
              <div className="mode-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                </svg>
              </div>
              <h3 style={{ marginTop: "16px", marginBottom: "8px" }}>Offline Only</h3>
              <p style={{ margin: 0, color: "var(--c-ink-soft)", fontSize: "0.9rem" }}>
                No keys, no network calls. Local export workflow — ideal for QA and privacy-first apps.
              </p>
            </div>
          </Card>
          <Card>
            <div style={{ padding: "24px" }}>
              <div className="mode-icon mode-icon--accent">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.63 19.79 19.79 0 01.25 1a2 2 0 012-1.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.5 6.5l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
              </div>
              <h3 style={{ marginTop: "16px", marginBottom: "8px" }}>Core + Cloud</h3>
              <p style={{ margin: 0, color: "var(--c-ink-soft)", fontSize: "0.9rem" }}>
                Ingest key uploads reports into the CircleBox dashboard. Full timeline, raw downloads, and team access.
              </p>
            </div>
          </Card>
          <Card>
            <div style={{ padding: "24px" }}>
              <div className="mode-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                </svg>
              </div>
              <h3 style={{ marginTop: "16px", marginBottom: "8px" }}>Core + Self-Host</h3>
              <p style={{ margin: 0, color: "var(--c-ink-soft)", fontSize: "0.9rem" }}>
                Send reports to your own endpoint with optional aggregate usage beacon for fleet visibility.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <SectionTitle eyebrow="FAQ" title="Common questions" center />
        <div style={{ maxWidth: 720, margin: "0 auto", display: "grid", gap: 16 }}>
          {[
            {
              q: "Is the SDK truly open source?",
              a: "Yes. The native SDKs (iOS, Android, Flutter, React Native) are MIT-licensed and hosted on GitHub. You can use them without any cloud account.",
            },
            {
              q: "What counts as a report?",
              a: "One crash report upload equals one unit. Fragments from the low-bandwidth sync path count as fractional units and are billed proportionally.",
            },
            {
              q: "Can I switch plans?",
              a: "Yes, plan changes take effect at the next billing cycle. Downgrading retains your data until the retention window expires.",
            },
            {
              q: "Is there a free trial for Starter?",
              a: "Yes — 14 days of Starter features, no credit card required. After the trial ends you stay on Free unless you upgrade.",
            },
          ].map(({ q, a }) => (
            <Card key={q}>
              <div style={{ padding: "20px 24px" }}>
                <strong style={{ display: "block", marginBottom: 8 }}>{q}</strong>
                <p style={{ margin: 0, color: "var(--c-ink-soft)", fontSize: "0.9rem" }}>{a}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="cta-section">
        <h2>Ready to ship with confidence?</h2>
        <p>Start free. No credit card required.</p>
        <div className="cta-row">
          <a href="/signup" className="btn btn-primary btn-lg">Create Free Account</a>
          <a href="/docs/getting-started" className="btn btn-lg">Read the Docs</a>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{__html: `
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          align-items: start;
        }

        @media (max-width: 900px) {
          .pricing-grid { grid-template-columns: 1fr; max-width: 480px; margin: 0 auto; }
        }

        .pricing-card {
          background: var(--c-surface);
          border: 1px solid var(--c-border);
          border-radius: var(--radius-lg);
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          position: relative;
          transition: box-shadow var(--trans-base);
        }

        .pricing-card:hover {
          box-shadow: var(--shadow-md);
        }

        .pricing-card--featured {
          border-color: var(--c-accent);
          box-shadow: 0 0 0 2px var(--c-accent), var(--shadow-lg);
        }

        .pricing-featured-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--c-accent);
          color: white;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 4px 12px;
          border-radius: var(--radius-full);
          white-space: nowrap;
        }

        .pricing-card-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .pricing-plan-name {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--c-ink);
        }

        .pricing-price-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .pricing-price {
          font-size: 2.25rem;
          font-weight: 800;
          line-height: 1;
          color: var(--c-ink);
        }

        .pricing-period {
          font-size: 0.85rem;
          color: var(--c-ink-soft);
        }

        .pricing-subtitle {
          margin: 0;
          font-size: 0.875rem;
          color: var(--c-ink-soft);
          line-height: 1.5;
        }

        .pricing-bullets {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
        }

        .pricing-bullet {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.875rem;
          color: var(--c-ink);
          line-height: 1.4;
        }

        .bullet-check {
          flex-shrink: 0;
          width: 18px;
          height: 18px;
          background: var(--c-accent-subtle);
          color: var(--c-accent);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 1px;
        }

        .pricing-cta {
          margin-top: auto;
        }

        .pricing-btn {
          width: 100%;
          text-align: center;
          justify-content: center;
          display: flex;
        }

        .mode-icon {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          background: var(--c-bg);
          border: 1px solid var(--c-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--c-ink-soft);
        }

        .mode-icon--accent {
          background: var(--c-accent-subtle);
          border-color: var(--c-accent);
          color: var(--c-accent);
        }
      `}} />
    </div>
  );
}
