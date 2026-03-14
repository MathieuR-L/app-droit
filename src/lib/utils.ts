export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) {
    return "Non defini";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatRelativeMinutes(minutes: number) {
  if (minutes <= 1) {
    return "1 minute";
  }

  return `${minutes} minutes`;
}

export function addMinutes(baseDate: Date, minutes: number) {
  return new Date(baseDate.getTime() + minutes * 60_000);
}
