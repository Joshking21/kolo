export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const datePart = formatDate(d);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(d)
    .toLowerCase();
  return `${datePart}, ${timePart}`;
}

export function formatRelative(
  iso: string | Date,
  now: Date = new Date()
): string {
  const target = typeof iso === 'string' ? new Date(iso) : iso;
  const diffMs = target.getTime() - now.getTime();

  // If within 1 minute
  if (Math.abs(diffMs) < 60_000) {
    return 'just now';
  }

  // Future
  if (diffMs > 0) {
    const diffMin = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
    const calendarDays = Math.round((startOfTarget - startOfToday) / 86_400_000);

    if (diffMin < 60) {
      return `in ${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'}`;
    }
    if (diffHours < 24 && calendarDays === 0) {
      return `in ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`;
    }
    if (calendarDays === 1) {
      return 'tomorrow';
    }
    if (calendarDays > 1 && calendarDays <= 6) {
      return `in ${calendarDays} days`;
    }
    return formatDate(target);
  }

  // Past
  const pastMs = -diffMs;
  const diffMin = Math.floor(pastMs / 60_000);
  const diffHours = Math.floor(pastMs / 3_600_000);

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const calendarDays = Math.round((startOfToday - startOfTarget) / 86_400_000);

  if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diffHours < 24 && calendarDays === 0) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (calendarDays === 1) {
    return 'yesterday';
  }
  if (calendarDays > 1 && calendarDays <= 6) {
    return `${calendarDays} days ago`;
  }
  return formatDate(target);
}

export function formatDue(
  iso: string | Date,
  now: Date = new Date()
): string {
  const target = typeof iso === 'string' ? new Date(iso) : iso;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const dayDiff = Math.round((startOfTarget - startOfToday) / 86_400_000);

  if (dayDiff === 0) return 'Due today';
  if (dayDiff === 1) return 'Due tomorrow';
  if (dayDiff > 1) return `Due in ${dayDiff} days`;
  if (dayDiff === -1) return 'Overdue by 1 day';
  return `Overdue by ${Math.abs(dayDiff)} days`;
}
