import { PulseInfoPage } from "@/components/pulse/PulseInfoPage";

export default function AboutPage() {
  return (
    <PulseInfoPage
      eyebrow="About Fracture"
      title="A live read on how the story is being told."
      deck="Fracture is built for readers who want to compare coverage without losing the pace of the news cycle."
      cards={[
        { label: "Signal", value: "Live", body: "Stories are organized around active movement, source spread, and freshness." },
        { label: "Lens", value: "FDI", body: "The Fracture Divergence Index measures distance across framing, tone, headlines, and source emphasis." },
        { label: "Posture", value: "Clear", body: "The product is designed to show contrast without turning the reader into the product." },
      ]}
      sections={[
        {
          title: "Fracture compares coverage, not readers.",
          body: "The platform groups related articles into story clusters and highlights how outlets frame the same event differently. The goal is not to tell people what to think. It is to show what changed between accounts.",
        },
        {
          title: "The homepage behaves like a live editorial desk.",
          body: "Top stories, newest movement, live updates, timelines, and source maps are organized for quick scanning first, then deeper inspection when a story needs more context.",
        },
        {
          title: "Story pages are built around source-level contrast.",
          body: "Each story detail page shows the shared context, headline comparison, source map, Fracture reading, and reader feedback so the analysis can be challenged.",
        },
        {
          title: "The mission is reader agency.",
          body: "Modern news moves quickly and often arrives already framed. Fracture gives readers a cleaner way to see how framing differs before deciding what deserves their attention.",
        },
      ]}
    />
  );
}
