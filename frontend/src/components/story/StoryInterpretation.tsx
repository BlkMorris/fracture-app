"use client";

import { severityTier } from "@/lib/TERMINOLOGY_CONSTANTS";
import { motion } from "framer-motion";

interface StoryInterpretationProps {
  overallScore: number;
  sourceCount: number;
}

/* Level-keyed interpretation copy */
function getInterpretation(
  tier: string,
  sourceCount: number,
): { headline: string; body: string } {
  switch (tier) {
    case "Low":
      return {
        headline: "Consensus Coverage",
        body: `Across ${sourceCount} sources, the coverage is largely consistent. Minor variations exist in emphasis and tone, but the fundamental narrative is aligned.`,
      };
    case "Moderate":
      return {
        headline: "Diverging Narratives",
        body: `Notable differences are emerging across ${sourceCount} sources. Framing choices and emphasis vary meaningfully, suggesting the story is being shaped differently by different outlets.`,
      };
    case "High":
      return {
        headline: "Significantly Fractured",
        body: `Major narrative divergence detected across ${sourceCount} sources. Outlets are presenting substantially different versions of events, with conflicting framing, tone, and emphasis.`,
      };
    case "Extreme":
      return {
        headline: "Extreme Divergence",
        body: `This story shows critical levels of narrative fracture across ${sourceCount} sources. Coverage is so divided that consumers may encounter fundamentally incompatible versions of events.`,
      };
    default:
      return {
        headline: "Analysis Pending",
        body: "Divergence analysis is still being computed for this story cluster.",
      };
  }
}

export default function StoryInterpretation({
  overallScore,
  sourceCount,
}: StoryInterpretationProps) {
  const tier = severityTier(overallScore);
  const { headline, body } = getInterpretation(tier, sourceCount);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4 }}
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--color-surface)",
        padding: "18px 20px",
        marginBottom: 20,
      }}
    >
      <h3
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--color-secondary)",
          margin: "0 0 10px",
        }}
      >
        Interpretation
      </h3>
      <h4
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 18,
          fontWeight: 400,
          color: "var(--color-text-strong)",
          margin: "0 0 8px",
          lineHeight: 1.3,
        }}
      >
        {headline}
      </h4>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 13,
          color: "var(--color-secondary)",
          lineHeight: 1.65,
          margin: 0,
        }}
      >
        {body}
      </p>
    </motion.section>
  );
}
