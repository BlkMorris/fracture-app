import { PulseInfoPage } from "@/components/pulse/PulseInfoPage";

export default function TermsPage() {
  return (
    <PulseInfoPage
      eyebrow="Terms"
      title="Terms for a product that compares coverage."
      deck="Fracture is an editorial intelligence product. Its analysis should be used as a context layer, not as a substitute for primary reporting or professional advice."
      cards={[
        { label: "Use", value: "Context", body: "FDI and source-map signals are designed to support comparison and critical reading." },
        { label: "Limits", value: "No verdicts", body: "A divergence score is not a claim that an outlet or article is false." },
        { label: "Review", value: "Human", body: "Reader feedback helps identify stories that deserve a closer editorial review." },
      ]}
      sections={[
        {
          title: "Fracture summarizes and compares public coverage.",
          body: "The platform organizes source articles into clusters and produces analysis of framing differences. Users should consult original reporting when they need the full source article.",
        },
        {
          title: "Scores are analytical signals.",
          body: "Fracture scores are based on available data and model-assisted analysis. They may be incomplete, delayed, or wrong, especially during fast-moving events.",
        },
        {
          title: "Reader feedback is quality signal.",
          body: "When users flag an analysis for review, that signal should help the Fracture team improve the story read and identify possible data issues.",
        },
        {
          title: "This page is a product placeholder.",
          body: "Before launch, this page should be reviewed and replaced with legal terms that match the production service and business model.",
        },
      ]}
    />
  );
}
