import Link from "next/link";

export default function HomePage() {
  return (
    <section>
      <h2>Overview</h2>
      <p>Cloud ingest, crash timelines, and fragment-first reliability pipeline.</p>
      <ul>
        <li><Link href="/crashes">Crash Timeline Explorer</Link></li>
      </ul>
    </section>
  );
}
