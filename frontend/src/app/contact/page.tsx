import { PulseInfoPage } from "@/components/pulse/PulseInfoPage";

export default function ContactPage() {
  return (
    <PulseInfoPage
      eyebrow="Contact"
      title="Send the signal to the right desk."
      deck="Reach out about sources, methodology, partnerships, corrections, or product access."
      contact
      actions={[
        { label: "Email Fracture", href: "mailto:hello@fracture.media" },
        { label: "Browse Stories", href: "/stories" },
      ]}
      cards={[
        { label: "Corrections", value: "Review", body: "Flag analysis, source metadata, or story-context issues that need attention." },
        { label: "Sources", value: "Add", body: "Suggest outlets, feeds, APIs, or licensed providers that should be considered." },
        { label: "Access", value: "Talk", body: "Ask about product access, analyst workflows, or newsroom use cases." },
      ]}
      sections={[
        {
          title: "For corrections and analysis issues.",
          body: "Include the story link, source name, and the specific part of the Fracture read that appears wrong or incomplete.",
        },
        {
          title: "For source additions.",
          body: "Send the outlet name, homepage, feed URL or API documentation, and any relevant notes about coverage focus or region.",
        },
        {
          title: "For partnerships.",
          body: "Fracture is designed for readers, analysts, and editorial teams that need fast comparison across source coverage.",
        },
        {
          title: "For product feedback.",
          body: "Share where the interface helps, where it slows you down, and which signals should become more visible in future releases.",
        },
      ]}
    />
  );
}
