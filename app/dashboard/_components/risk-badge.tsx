import { riskBadgeStyles, riskLabel, riskTone } from "../lib/risk";

export function RiskBadge({ risk }: { risk: string | undefined }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${riskBadgeStyles[riskTone(risk)]}`}>
      {riskLabel(risk)}
    </span>
  );
}
