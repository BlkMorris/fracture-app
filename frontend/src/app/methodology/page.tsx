import { PulseInfoPage } from "@/components/pulse/PulseInfoPage";

export default function MethodologyPage() {
  return (
    <PulseInfoPage
      eyebrow="Methodology"
      title="How Fracture turns coverage into a readable signal."
      deck="Fracture watches related coverage across sources, clusters articles into stories, then measures where framing, tone, and headline emphasis diverge."
      cards={[
        { label: "Step 01", value: "Ingest", body: "Articles enter through configured source feeds and are normalized into a common article shape." },
        { label: "Step 02", value: "Cluster", body: "Related articles are grouped into story clusters using topic, timing, and source overlap." },
        { label: "Step 03", value: "Compare", body: "The system scores differences in headlines, sentiment, framing type, and structural emphasis." },
      ]}
      sections={[
        {
          title: "Fracture starts with source collection.",
          body: "The ingestion pipeline pulls articles from configured feeds or APIs, preserves the outlet identity, and stores publication timing, headline text, summary data, image metadata, and known source priors.",
        },
        {
          title: "Story clusters are built from shared events.",
          body: "Articles become more useful when they are compared against other coverage of the same event. Fracture groups related articles so readers can inspect the spread rather than a single isolated account.",
        },
        {
          title: "FDI measures framing distance.",
          body: "The Fracture Divergence Index summarizes measurable distance in headline sentiment, framing type entropy, entity emphasis, source selection variance, and structural divergence.",
        },
        {
          title: "The score is a signal, not a verdict.",
          body: "A high FDI score means coverage is farther apart across measurable dimensions. It does not automatically mean one outlet is wrong or another is right.",
        },
      ]}
    />
  );
}
