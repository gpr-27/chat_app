export function formatMessageTime(date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Compact timestamp for the sidebar preview: "now", "5m", "3h", "Mon", "12/04".
export function formatRelativeTime(date) {
  if (!date) return "";
  const then = new Date(date);
  const now = new Date();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;

  const diffHours = Math.floor(diffMin / 60);
  if (isSameDay(then, now)) return `${diffHours}h`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(then, yesterday)) return "Yesterday";

  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    return then.toLocaleDateString("en-US", { weekday: "short" });
  }
  return then.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
}

// Day label shown between groups of messages.
export function formatDateSeparator(date) {
  const then = new Date(date);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(then, now)) return "Today";
  if (isSameDay(then, yesterday)) return "Yesterday";
  return then.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function isNewDay(prevDate, currentDate) {
  if (!prevDate) return true;
  return !isSameDay(new Date(prevDate), new Date(currentDate));
}
