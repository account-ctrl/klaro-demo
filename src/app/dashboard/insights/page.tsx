import { InsightsGenerator } from "./insights-generator";

export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Barangay Data Insights</h1>
        <p className="text-muted-foreground">
          Leverage AI to analyze your barangay's data and uncover valuable insights.
        </p>
      </div>
      
      <InsightsGenerator />
    </div>
  );
}
