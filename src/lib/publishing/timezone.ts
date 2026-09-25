import { PublishingError } from "./errors";

/** Convert a local date/time in an IANA timezone to UTC ISO string. */
export function localDateTimeToUtcIso(input: {
  date: string;
  time: string;
  timezone: string;
}): string {
  const { date, time, timezone } = input;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new PublishingError("invalid_schedule", "Invalid schedule date.");
  }

  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new PublishingError("invalid_schedule", "Invalid schedule time.");
  }

  if (!timezone || !isValidTimeZone(timezone)) {
    throw new PublishingError("invalid_schedule", "Invalid timezone.");
  }

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const offsetMinutes = getTimeZoneOffsetMinutes(new Date(utcGuess), timezone);
  const utcMs = utcGuess - offsetMinutes * 60_000;

  const scheduled = new Date(utcMs);
  if (Number.isNaN(scheduled.getTime())) {
    throw new PublishingError("invalid_schedule", "Unable to parse scheduled time.");
  }

  if (scheduled.getTime() <= Date.now() + 60_000) {
    throw new PublishingError(
      "invalid_schedule",
      "Scheduled time must be at least one minute in the future."
    );
  }

  return scheduled.toISOString();
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const lookup = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );

  const asUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second)
  );

  return (asUtc - date.getTime()) / 60_000;
}

export function getDefaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}
