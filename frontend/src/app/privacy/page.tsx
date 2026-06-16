import { PulseInfoPage } from "@/components/pulse/PulseInfoPage";

export default function PrivacyPage() {
  return (
    <PulseInfoPage
      eyebrow="Privacy"
      title="Privacy should be readable at newsroom speed."
      deck="Fracture should collect only what the product needs, protect account data, and keep reader feedback separate from editorial analysis unless a user submits it."
      cards={[
        { label: "Accounts", value: "Minimal", body: "Login and registration should only require the fields needed to authenticate and maintain access." },
        { label: "Feedback", value: "Scoped", body: "Reader review signals should be used to improve analysis quality, not to profile readers." },
        { label: "Sources", value: "Public", body: "Source article URLs and outlet metadata are treated as public editorial inputs." },
      ]}
      sections={[
        {
          title: "Account data is product data, not editorial data.",
          body: "Authentication information should be stored and handled separately from story analysis, source scoring, and public article data.",
        },
        {
          title: "Reader actions should stay intentional.",
          body: "Searches, watchlists, comments, and review requests should be designed so users know when they are creating a saved signal or sending feedback.",
        },
        {
          title: "External source links stay inside Fracture context.",
          body: "Source brief modals show outlet metadata and article context without forcing the reader out of the app during comparison.",
        },
        {
          title: "This page is a product placeholder.",
          body: "Before launch, this page should be reviewed and replaced with legal language that matches the deployed data practices and jurisdiction requirements.",
        },
      ]}
    />
  );
}
