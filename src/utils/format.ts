/**
 * Utility functions for formatting
 */

/** Format temperature with unit */
export function formatTemperature(temp: number, unit: string = "°C"): string {
  return `${Math.round(temp)}${unit}`;
}

/** Format wind speed */
export function formatWindSpeed(speed: number): string {
  return `${Math.round(speed)} km/h`;
}

/** Format humidity */
export function formatHumidity(humidity: number): string {
  return `${Math.round(humidity)}%`;
}

/** Format wind direction (degrees → compass) */
export function formatWindDirection(degrees: number, locale: "zh" | "en" = "zh"): string {
  const directionsZh = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  const directionsEn = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const directions = locale === "zh" ? directionsZh : directionsEn;
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

/** Format date to locale string */
export function formatDate(dateStr: string, locale: string = "zh-CN"): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

/** Format weekday */
export function formatWeekday(dateStr: string, locale: string = "zh-CN"): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);

  if (today.getTime() === target.getTime()) {
    return locale === "zh-CN" ? "今天" : "Today";
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (tomorrow.getTime() === target.getTime()) {
    return locale === "zh-CN" ? "明天" : "Tomorrow";
  }

  return date.toLocaleDateString(locale, { weekday: "short" });
}

/** Format time */
export function formatTime(timeStr: string, locale: string = "zh-CN"): string {
  const date = new Date(timeStr);
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
