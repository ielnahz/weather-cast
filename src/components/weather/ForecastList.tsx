/**
 * ForecastList — Container for forecast cards
 *
 * Renders forecast cards in a flex row that fills the container width.
 * Each card has a minimum width (78px) and grows equally via `flex-1`
 * to distribute available space — no clustering, no empty right gap.
 *
 * On very narrow screens the cards hit their min-width and the row
 * scrolls horizontally; on wider screens they expand to fill.
 *
 * Props are explicit — receives an array of ForecastDay with typed fields.
 */

import { ForecastCard } from "./ForecastCard";
import { Section } from "@/components/layout/PageShell";
import type { ForecastDay } from "@/types";

interface ForecastListProps {
  forecast: ForecastDay[];
}

export function ForecastList({ forecast }: ForecastListProps) {
  if (forecast.length === 0) return null;

  return (
    <Section title="未来 7 天预报">
      <div className="flex gap-2 md:gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {forecast.map((day) => (
          <div key={day.date} className="snap-start flex-1 min-w-[78px]">
            <ForecastCard
              date={day.date}
              weatherType={day.weatherType}
              weatherDescription={day.weatherDescription}
              tempMax={day.tempMax}
              tempMin={day.tempMin}
              precipitationProbability={day.precipitationProbability}
            />
          </div>
        ))}
      </div>
    </Section>
  );
}
