/**
 * WeatherIcon — Maps WeatherType to SVG icon
 *
 * Each weather type has a custom SVG icon.
 * Icons are inline SVG (no external dependencies, lazy-loaded naturally).
 *
 * Layout convention (64x64 viewBox):
 * - Cloud occupies y=6..38, horizontally centered around x=32
 * - Precipitation elements fall from y=42 downward, centered under the cloud
 * - All elements are optically centered on x=32
 */

import type { WeatherType } from "@/types";

interface WeatherIconProps {
  type: WeatherType;
  isDay?: boolean;
  size?: number;
}

export function WeatherIcon({ type, isDay = true, size = 48 }: WeatherIconProps) {
  const className = "weather-icon";
  const style = { width: size, height: size };

  switch (type) {
    case "clear":
      return isDay ? <SunIcon className={className} style={style} /> : <MoonIcon className={className} style={style} />;
    case "partly_cloudy":
      return <PartlyCloudyIcon className={className} style={style} />;
    case "cloudy":
      return <CloudyIcon className={className} style={style} />;
    case "overcast":
      return <OvercastIcon className={className} style={style} />;
    case "fog":
      return <FogIcon className={className} style={style} />;
    case "drizzle":
      return <DrizzleIcon className={className} style={style} />;
    case "rain":
      return <RainIcon className={className} style={style} />;
    case "heavy_rain":
      return <HeavyRainIcon className={className} style={style} />;
    case "snow":
      return <SnowIcon className={className} style={style} />;
    case "heavy_snow":
      return <HeavySnowIcon className={className} style={style} />;
    case "thunderstorm":
      return <ThunderstormIcon className={className} style={style} />;
    case "thunderstorm_hail":
      return <ThunderstormHailIcon className={className} style={style} />;
    default:
      return <SunIcon className={className} style={style} />;
  }
}

type IconProps = { className: string; style: React.CSSProperties };

/* -------------------------------------------------------------------------- */
/*  Shared cloud shape — the single source of truth for all cloud icons.      */
/*  Spans x=10..54. Bottom edge at y=38. Precipitation falls from y=44 down. */
/*  Whole composition is wrapped in a translate to optically center it.      */
/* -------------------------------------------------------------------------- */

const CLOUD_D = "M44 38c-6 0-11-4-12-9-5 0-9-4-9-9s4-9 9-9c1-5 6-9 12-9s11 4 12 9c5 0 9 4 9 9s-4 9-9 9c-1 5-6 9-12 9z";

/** Vertical offset applied to the whole icon group so it optically centers.
 *  Cloud-only icons sit 6px lower; icons with precipitation need less. */
const CLOUD_ONLY_SHIFT = 6;
const CLOUD_RAIN_SHIFT = 3;

function SunIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="13" fill="#FFD93D" />
      <g stroke="#FFD93D" strokeWidth="3" strokeLinecap="round">
        <line x1="32" y1="7" x2="32" y2="15" />
        <line x1="32" y1="49" x2="32" y2="57" />
        <line x1="7" y1="32" x2="15" y2="32" />
        <line x1="49" y1="32" x2="57" y2="32" />
        <line x1="14.5" y1="14.5" x2="20.5" y2="20.5" />
        <line x1="43.5" y1="43.5" x2="49.5" y2="49.5" />
        <line x1="49.5" y1="14.5" x2="43.5" y2="20.5" />
        <line x1="20.5" y1="43.5" x2="14.5" y2="49.5" />
      </g>
    </svg>
  );
}

function MoonIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M44 36c-12 0-22-10-22-22 0-3 .6-5.8 1.7-8.3C14.7 9.6 8 18.5 8 29c0 13.3 10.7 24 24 24 8.5 0 16-4.5 20.3-11.3-2.5 1-5.3 1.3-8.3 1.3z" fill="#C7D0E0" />
    </svg>
  );
}

function PartlyCloudyIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sun sits up-left (cx=22), cloud sits down-right (centre x=38).
          The pair's combined silhouette is balanced about x=32. */}
      <circle cx="22" cy="22" r="10" fill="#FFD93D" />
      <g stroke="#FFD93D" strokeWidth="2.5" strokeLinecap="round">
        <line x1="22" y1="5" x2="22" y2="10" />
        <line x1="22" y1="34" x2="22" y2="39" />
        <line x1="5" y1="22" x2="10" y2="22" />
        <line x1="34" y1="22" x2="39" y2="22" />
        <line x1="10" y1="10" x2="13.5" y2="13.5" />
        <line x1="30.5" y1="30.5" x2="34" y2="34" />
        <line x1="34" y1="10" x2="30.5" y2="13.5" />
        <line x1="13.5" y1="30.5" x2="10" y2="34" />
      </g>
      {/* Cloud — bottom edge at y=50, horizontally centred on x=38 */}
      <path d="M48 50c-5 0-9-3-10-7-4 0-7-3-7-7s3-7 7-7c1-4 5-7 10-7s9 3 10 7c4 0 7 3 7 7s-3 7-7 7c-1 4-5 7-10 7z" fill="#E8EEF7" stroke="#B8C4D6" strokeWidth="1.5" />
    </svg>
  );
}

function CloudyIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform={`translate(0 ${CLOUD_ONLY_SHIFT})`}>
        <path d={CLOUD_D} fill="#E8EEF7" stroke="#B8C4D6" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

function OvercastIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform={`translate(0 ${CLOUD_ONLY_SHIFT})`}>
        {/* Two overlapping clouds.
            Back cloud (darker) is shifted up-RIGHT, front cloud (lighter)
            is shifted down-LEFT. Both offsets are equal and opposite so
            the pair's combined silhouette stays balanced about x=32. */}
        <path d="M45 30c-4.5 0-8-2.8-9-6.5-3.6 0-6.5-2.9-6.5-6.5s2.9-6.5 6.5-6.5c1-3.7 4.5-6.5 9-6.5s8 2.8 9 6.5c3.6 0 6.5 2.9 6.5 6.5s-2.9 6.5-6.5 6.5c-1 3.7-4.5 6.5-9 6.5z" fill="#B8C4D6" stroke="#98A8BC" strokeWidth="1.5" />
        <path d="M19 48c-4.5 0-8-2.8-9-6.5-3.6 0-6.5-2.9-6.5-6.5S6.4 28.5 10 28.5c1-3.7 4.5-6.5 9-6.5s8 2.8 9 6.5c3.6 0 6.5 2.9 6.5 6.5s-2.9 6.5-6.5 6.5c-1 3.7-4.5 6.5-9 6.5z" fill="#D1D9E6" stroke="#B0BCCC" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

function FogIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform={`translate(0 ${CLOUD_ONLY_SHIFT})`}>
        <path d={CLOUD_D} fill="#E8EEF7" stroke="#B8C4D6" strokeWidth="1.5" />
        {/* Fog bars — staggered but each bar centred on x=32 */}
        <g stroke="#A8B8CC" strokeWidth="2.5" strokeLinecap="round">
          <line x1="17" y1="46" x2="47" y2="46" />
          <line x1="22" y1="53" x2="42" y2="53" />
          <line x1="15" y1="60" x2="49" y2="60" />
        </g>
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Precipitation variants                                                     */
/*  Cloud bottom = y38. Precipitation occupies y42..63, centred on x=32.     */
/*  Every precipitation element is drawn so that its OWN visual centroid      */
/*  sits on the x=32 axis — not merely its anchor point. Slanted strokes     */
/*  therefore carry a half-slant offset, and scattered elements are mirrored  */
/*  about the axis.                                                          */
/* -------------------------------------------------------------------------- */

function DrizzleIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform={`translate(0 ${CLOUD_RAIN_SHIFT})`}>
        <path d={CLOUD_D} fill="#D8E2F0" stroke="#A8B8CC" strokeWidth="1.5" />
        {/* Fine scattered droplets — arranged symmetrically about x=32 */}
        <g fill="#A0C8E8">
          <circle cx="23" cy="46" r="1.8" />
          <circle cx="32" cy="49" r="1.8" />
          <circle cx="41" cy="46" r="1.8" />
          <circle cx="27.5" cy="55" r="1.6" />
          <circle cx="36.5" cy="55" r="1.6" />
        </g>
      </g>
    </svg>
  );
}

function RainIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform={`translate(0 ${CLOUD_RAIN_SHIFT})`}>
        <path d={CLOUD_D} fill="#C8D4E8" stroke="#A0AEC8" strokeWidth="1.5" />
        {/* Three slanted rain streaks.
            The slant is (-3,+12); shifting the group +1.5 puts the
            middle streak's visual centroid exactly on the x=32 axis. */}
        <g stroke="#5B9BD5" strokeWidth="2.5" strokeLinecap="round" transform="translate(1.5 0)">
          <line x1="24" y1="44" x2="21" y2="56" />
          <line x1="33" y1="44" x2="30" y2="56" />
          <line x1="42" y1="44" x2="39" y2="56" />
        </g>
      </g>
    </svg>
  );
}

function HeavyRainIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform={`translate(0 ${CLOUD_RAIN_SHIFT})`}>
        <path d={CLOUD_D} fill="#B8C8E0" stroke="#90A0C0" strokeWidth="1.5" />
        {/* Five dense streaks — same +1.5 centroid correction as RainIcon */}
        <g stroke="#3B7CC5" strokeWidth="2.5" strokeLinecap="round" transform="translate(1.5 0)">
          <line x1="20" y1="43" x2="17" y2="57" />
          <line x1="27" y1="43" x2="24" y2="57" />
          <line x1="34" y1="43" x2="31" y2="57" />
          <line x1="41" y1="43" x2="38" y2="57" />
          <line x1="48" y1="43" x2="45" y2="57" />
        </g>
      </g>
    </svg>
  );
}

function SnowIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform={`translate(0 ${CLOUD_RAIN_SHIFT})`}>
        <path d={CLOUD_D} fill="#E8EEF7" stroke="#B8C4D6" strokeWidth="1.5" />
        {/* Three snowflakes — symmetric about x=32 (24 / 32 / 40) */}
        <g stroke="#90B8D8" strokeWidth="1.5" strokeLinecap="round">
          <g transform="translate(24 48)">
            <line x1="-3" y1="0" x2="3" y2="0" />
            <line x1="0" y1="-3" x2="0" y2="3" />
          </g>
          <g transform="translate(32 53)">
            <line x1="-3" y1="0" x2="3" y2="0" />
            <line x1="0" y1="-3" x2="0" y2="3" />
          </g>
          <g transform="translate(40 48)">
            <line x1="-3" y1="0" x2="3" y2="0" />
            <line x1="0" y1="-3" x2="0" y2="3" />
          </g>
        </g>
      </g>
    </svg>
  );
}

function HeavySnowIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform={`translate(0 ${CLOUD_RAIN_SHIFT})`}>
        <path d={CLOUD_D} fill="#D8E2F0" stroke="#A8B8D0" strokeWidth="1.5" />
        {/* Five snowflakes — mirrored pairs about x=32
            (21/43, 26/38, plus one dead-centre at 32) */}
        <g stroke="#80B0D0" strokeWidth="1.5" strokeLinecap="round">
          <g transform="translate(21 46)">
            <line x1="-2.5" y1="0" x2="2.5" y2="0" />
            <line x1="0" y1="-2.5" x2="0" y2="2.5" />
          </g>
          <g transform="translate(43 46)">
            <line x1="-2.5" y1="0" x2="2.5" y2="0" />
            <line x1="0" y1="-2.5" x2="0" y2="2.5" />
          </g>
          <g transform="translate(26 52)">
            <line x1="-2.5" y1="0" x2="2.5" y2="0" />
            <line x1="0" y1="-2.5" x2="0" y2="2.5" />
          </g>
          <g transform="translate(38 52)">
            <line x1="-2.5" y1="0" x2="2.5" y2="0" />
            <line x1="0" y1="-2.5" x2="0" y2="2.5" />
          </g>
          <g transform="translate(32 58)">
            <line x1="-2.5" y1="0" x2="2.5" y2="0" />
            <line x1="0" y1="-2.5" x2="0" y2="2.5" />
          </g>
        </g>
      </g>
    </svg>
  );
}

function ThunderstormIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform={`translate(0 ${CLOUD_RAIN_SHIFT})`}>
        <path d={CLOUD_D} fill="#A8B8D0" stroke="#8898B0" strokeWidth="1.5" />
        {/* Lightning bolt — symmetric zigzag about the x=32 axis.
            Top apex (32,42) → left shoulder (25,53) → step in (30,53)
            → lower apex (26,63) → right shoulder (39,51) → step in
            (33,51) → back to the apex. Left/right extents are
            25..39, so the shape's centroid sits on x=32. */}
        <path d="M32 42l-7 11h5l-4 10 13-13h-6l4-8z" fill="#FFD93D" stroke="#E8B800" strokeWidth="1" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

function ThunderstormHailIcon({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform={`translate(0 ${CLOUD_RAIN_SHIFT})`}>
        <path d={CLOUD_D} fill="#A8B8D0" stroke="#8898B0" strokeWidth="1.5" />
        {/* Lightning bolt — identical geometry to ThunderstormIcon */}
        <path d="M32 42l-7 11h5l-4 10 13-13h-6l4-8z" fill="#FFD93D" />
        {/* Hail stones — placed clear of the bolt, balanced left/right */}
        <g fill="#D0DDEE" stroke="#A8B8D0" strokeWidth="0.8">
          <circle cx="19" cy="50" r="2.5" />
          <circle cx="45" cy="50" r="2.5" />
          <circle cx="22" cy="58" r="2" />
          <circle cx="42" cy="58" r="2" />
        </g>
      </g>
    </svg>
  );
}
