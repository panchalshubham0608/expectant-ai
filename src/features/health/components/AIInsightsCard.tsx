import '../../../styles/features/health/components/AIInsightsCard.css';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { AIInsight } from '../../../models/ai';

interface AIInsightsCardProps {
  insights: AIInsight[];
}

export default function AIInsightsCard({ insights }: AIInsightsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section className="ai-insights-card">
      <div 
        className="ai-insights-card__header cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <p className="ai-insights-card__label">AI Insights</p>
          <h2 className="ai-insights-card__title">Smart Pregnancy Guidance</h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="ai-insights-card__meta">
            <Sparkles size={18} />
          </div>
          {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </div>
      </div>

      {isExpanded && (
      <div className="ai-insights-card__list">
        {insights.map((insight) => (
          <article key={insight.id} className="insight-card">
            <h3 className="insight-card__title">{insight.title}</h3>
            <p className="insight-card__description">{insight.description}</p>
          </article>
        ))}
      </div>
      )}
    </section>
  );
}
