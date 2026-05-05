import { Card } from "../../components/ui/card";
import { SectionTitle } from "../../components/ui/section-title";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    subtitle: "Best for solo developers and early validation",
    featured: false,
    cta: { label: "Get Started", href: "/signup" },
    bullets: [
      "5,000 crash reports / month",
      "1 project",
      "Core SDK + local export",
      "Optional cloud ingest",
      "Community support",
    ],
  },
  {
    name: "Starter",
    price: "$19",
    period: "/mo + usage",
    subtitle: "Small teams shipping production apps",
    featured: true,
    cta: { label: "Start Free Trial", href: "/signup" },
    bullets: [
      "Up to 100,000 reports / month",
      "Multiple projects",
      "US & EU regional data residency",
      "Dashboard + raw report downloads",
      "Sentry / PostHog adapters",
      "Email support",
    ],
  },
  {
    name: "Organization",
    price: "Custom",
    period: "",
    subtitle: "Compliance, high volume, and custom controls",
    featured: false,
    cta: { label: "Contact Sales", href: "mailto:hello@circlebox.dev" },
    bullets: [
      "Custom report & storage limits",
      "Security & compliance requirements",
      "Contracted SLA options",
      "Dedicated onboarding support",
      "SSO & audit logging (roadmap)",
    ],
  },
];

export default function PricingPage() {
  return (
    <section style={{ display: "grid", gap: 48 }}>
      <div style={{ textAlign: "center", padding: "48px 24px 0" }}>
        <SectionTitle
          eyebrow="Pricing"
          title="Simple for developers, scalable for teams"
          subtitle="Use CircleBox offline-only, with CircleBox Cloud, or plugged into your own backend."
          center
        />
      </div>

      {/* Plans Grid */}
      <div className="pricing-grid">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`pricing-card ${plan.featured ? "featured" : ""}`}
          >
            {plan.featured && (
              <div className="popular-badge">Most Popular</div>
            )}
            <div className="pricing-card-inner">
              <div>
                <h3 className="plan-name">{plan.name}</h3>
                <div className="plan-price-row">
                  <span className="plan-price">{plan.price}</span>
                  {plan.period && <span className="plan-period">{plan.period}</span>}
                </div>
                <p className="plan-subtitle">{plan.subtitle}</p>
                <ul className="plan-bullets">
                  {plan.bullets.map((bullet) => (
                    <li key={bullet}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, color: plan.featured ? "#10b981" : "#64748b" }}>
                        <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
              <a
                href={plan.cta.href}
                className={`btn ${plan.featured ? "btn-primary" : ""}`}
                style={{ width: "100%", justifyContent: "center", marginTop: "auto" }}
              >
                {plan.cta.label}
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Customer Modes */}
      <Card>
        <div style={{ padding: "24px 28px" }}>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Deployment Modes</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {[
              {
                title: "Offline Only",
                desc: "No keys, no network calls. Local export workflow for QA, CI, or self-hosted pipelines.",
                icon: "💾",
              },
              {
                title: "Core + Cloud",
                desc: "Ingest key uploads reports into CircleBox Cloud. Dashboard, timeline, and raw downloads included.",
                icon: "☁️",
              },
              {
                title: "Core + Self-Host",
                desc: "Send reports to your own endpoint. Optionally emit aggregate usage beacon to monitor fleet health.",
                icon: "🔧",
              },
            ].map(({ title, desc, icon }) => (
              <div key={title} style={{ display: "flex", gap: 12 }}>
                <div style={{ fontSize: "20px", lineHeight: 1, marginTop: 2 }}>{icon}</div>
                <div>
                  <strong style={{ fontSize: "0.9rem", display: "block", marginBottom: 4 }}>{title}</strong>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--c-ink-soft)" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <style>{`
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          align-items: start;
        }

        .pricing-card {
          border: 1px solid var(--c-border);
          border-radius: var(--radius-lg);
          background: var(--c-surface);
          position: relative;
          transition: box-shadow 0.2s;
        }

        .pricing-card:hover {
          box-shadow: var(--shadow-md);
        }

        .pricing-card.featured {
          border-color: var(--c-accent);
          box-shadow: 0 0 0 1px var(--c-accent), var(--shadow-lg);
        }

        .popular-badge {
          position: absolute;
          top: -13px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--c-accent);
          color: white;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 3px 14px;
          border-radius: 999px;
          white-space: nowrap;
        }

        .pricing-card-inner {
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: 100%;
        }

        .plan-name {
          margin: 0 0 8px;
          font-size: 1.1rem;
          font-weight: 700;
        }

        .plan-price-row {
          display: flex;
          align-items: baseline;
          gap: 4px;
          margin-bottom: 8px;
        }

        .plan-price {
          font-size: 2rem;
          font-weight: 800;
          color: var(--c-ink);
          line-height: 1;
        }

        .plan-period {
          font-size: 0.875rem;
          color: var(--c-ink-soft);
        }

        .plan-subtitle {
          margin: 0 0 16px;
          font-size: 0.875rem;
          color: var(--c-ink-soft);
        }

        .plan-bullets {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 8px;
        }

        .plan-bullets li {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 0.875rem;
          color: var(--c-ink);
        }

        @media (max-width: 1024px) {
          .pricing-grid {
            grid-template-columns: 1fr;
            max-width: 480px;
            margin: 0 auto;
          }
        }

        @media (max-width: 640px) {
          .pricing-grid {
            max-width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
