export interface AvatarProps {
  name: string;
  userId?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const PALETTE = [
  { bg: '#0F3D2E', text: '#FBF7EF' }, // Deep green
  { bg: '#8C4700', text: '#FFFFFF' }, // Warm umber
  { bg: '#1E3A5F', text: '#FFFFFF' }, // Indigo slate
  { bg: '#5C2448', text: '#FFFFFF' }, // Deep plum
  { bg: '#0B4F4A', text: '#FFFFFF' }, // Dark teal
  { bg: '#52361B', text: '#FFFFFF' }, // Rich terracotta
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0]![0] || '').toUpperCase();
  return ((parts[0]![0] || '') + (parts[parts.length - 1]![0] || '')).toUpperCase();
}

export function Avatar({
  name,
  userId,
  size = 'md',
  className = '',
}: AvatarProps) {
  const hashKey = userId || name || 'default';
  const colorIndex = hashString(hashKey) % PALETTE.length;
  const color = PALETTE[colorIndex]!;
  const initials = getInitials(name);

  const sizeClasses = {
    sm: 'w-8 h-8 text-[12px]',
    md: 'w-10 h-10 text-[14px]',
    lg: 'w-12 h-12 text-[16px]',
  };

  return (
    <div
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold select-none ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: color.bg, color: color.text }}
      title={name}
    >
      {initials}
    </div>
  );
}
