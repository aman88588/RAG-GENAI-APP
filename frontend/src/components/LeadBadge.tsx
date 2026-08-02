import { Flame, Thermometer, Snowflake } from 'lucide-react';
import type { LeadQuality } from '../../services/api.service';

interface LeadBadgeProps {
  classification: LeadQuality | null | undefined;
  size?: 'sm' | 'md';
}

const CONFIG: Record<LeadQuality, { label: string; classes: string; icon: React.FC<{ className?: string }> }> = {
  Hot: { label: 'Hot Lead', classes: 'badge-hot', icon: Flame },
  Warm: { label: 'Warm Lead', classes: 'badge-warm', icon: Thermometer },
  Cold: { label: 'Cold Lead', classes: 'badge-cold', icon: Snowflake },
};

export function LeadBadge({ classification, size = 'md' }: LeadBadgeProps) {
  if (!classification || !CONFIG[classification]) {
    return (
      <span className="badge border-slate-200 bg-slate-50 text-slate-500">
        Unknown
      </span>
    );
  }

  const { label, classes, icon: Icon } = CONFIG[classification];
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <span className={classes}>
      <Icon className={iconSize} />
      {label}
    </span>
  );
}
