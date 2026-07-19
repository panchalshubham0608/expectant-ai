import '../../../styles/features/health/components/AIInsightsCard.css';
import { Sparkles } from 'lucide-react';
import type { AIInsight } from '../types';

interface AIInsightsCardProps {
  insights: AIInsight[];
}

export default function AIInsightsCard({ insights }: AIInsightsCardProps) {
  return (
    <section className="ai-insights-card">
      <div className="ai-insights-card__header">
        <div>
          <p className="ai-insights-card__label">AI Insights</p>
          <h2 className="ai-insights-card__title">Smart Pregnancy Guidance</h2>
        </div>

        <div className="ai-insights-card__meta">
          <Sparkles size={18} />
        </div>
      </div>

      <div className="ai-insights-card__list">
        {insights.map((insight) => (
          <article key={insight.id} className="insight-card">
            <h3 className="insight-card__title">{insight.title}</h3>
            <p className="insight-card__description">{insight.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
