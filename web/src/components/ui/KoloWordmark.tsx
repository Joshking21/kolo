import { Link } from 'react-router';

export function KoloWordmark({
  linkTo = '/',
  className = '',
}: {
  linkTo?: string;
  className?: string;
}) {
  const content = (
    <span className={`inline-flex items-center text-[22px] font-[650] tracking-[-0.02em] font-display text-ink select-none ${className}`}>
      <span>kolo</span>
      <span className="ml-1 inline-block h-[6px] w-[6px] rounded-full bg-accent shrink-0" />
    </span>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} aria-label="Kolo home" className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
