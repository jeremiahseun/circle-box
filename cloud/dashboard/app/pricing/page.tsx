import { Card } from "../../components/ui/card";
import { SectionTitle } from "../../components/ui/section-title";

const plans = [
  {
    name: "Free",
    price: "$0",
    subtitle: "Best for solo developers and early validation",
    bullets: [
      "5,000 reports / month",
      "Single project",
      "Core SDK + local export + optional cloud ingest",
      "Community support",
    ],
  },
  {
    name: "Starter",
    price: "$19/mo + usage",
    subtitle: "Small teams shipping production apps",
    bullets: [
      "Up to 100,000 reports / month before overage",
      "Multiple projects, US/EU regional ingest",
      "Dashboard + raw report downloads",
      "Optional Sentry/PostHog adapters",
    ],
  },
  {
    name: "Organization",
    price: "Contact Sales",
    subtitle: "Compliance, higher volume, and custom controls",
    bullets: [
      "Custom report/storage limits",
      "Security/compliance requirements",
      "Custom support and onboarding",
      "Contracted SLA options",
    ],
  },
];

export default function PricingPage() {
  return (
    <section style={{ display: "grid", gap: 16 }}>
      <Card>
        <div style={{ padding: 20 }}>
          <SectionTitle
            eyebrow="Pricing"
            title="Simple for developers, scalable for teams"
            subtitle="Use CircleBox offline-only, with CircleBox cloud, or with your own backend."
          />
        </div>
      </Card>

      <div className="grid-3">
        {plans.map((plan) => (
          <Card key={plan.name}>
            <div style={{ padding: 20 }}>
              <h3 style={{ marginTop: 0 }}>{plan.name}</h3>
              <p style={{ margin: "0 0 6px", fontWeight: 700 }}>{plan.price}</p>
              <p style={{ marginTop: 0, color: "var(--ink-soft)" }}>{plan.subtitle}</p>
              <ul style={{ marginBottom: 0, paddingLeft: 18 }}>
                {plan.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div style={{ padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>Customer Modes</h3>
          <ul style={{ marginBottom: 0, paddingLeft: 18 }}>
            <li><strong>Offline only:</strong> no keys, no network calls, local export workflow.</li>
            <li><strong>Core + cloud:</strong> ingest key uploads reports into CircleBox dashboard.</li>
            <li><strong>Core + self-host:</strong> send reports to your own endpoint and store optional aggregate usage beacon.</li>
          </ul>
        </div>
      </Card>
    </section>
  );
}
