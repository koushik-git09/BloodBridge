import type { BloodGroup } from '../types';

interface Props {
  group: BloodGroup;
  size?: 'sm' | 'md' | 'lg';
}

export default function BloodGroupBadge({ group, size = 'md' }: Props) {
  const sizes = { sm: 'text-xs w-8 h-8', md: 'text-sm w-10 h-10', lg: 'text-base w-14 h-14' };
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-mono font-bold bg-bb-crimson/15 border border-bb-crimson/40 text-bb-crimson-bright ${sizes[size]}`}
      aria-label={`Blood group ${group}`}
    >
      {group}
    </span>
  );
}
