import type {
  FullSlug,
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"
import { classNames, resolveRelative } from "@quartz-community/utils"
// @ts-expect-error - inline script import handled by the Quartz bundler
import script from "./lifeInWeeks.inline"
import style from "./lifeInWeeks.scss"

interface LifeInWeeksOptions {
  title?: string
  birthDate: string
  lifeExpectancy?: number
}

interface WeekEntry {
  week: number
  year: number
  title: string
  description?: string
  slug: FullSlug
  url: string
}

const defaultOptions = {
  title: "Life in Weeks",
  lifeExpectancy: 80,
} as const

const millisecondsPerDay = 24 * 60 * 60 * 1000
const millisecondsPerWeek = 7 * millisecondsPerDay

function getWeekDateRange(
  birthDate: Date,
  yearOffset: number,
  week: number,
): { start: Date; end: Date } {
  const year = birthDate.getUTCFullYear() + yearOffset
  const anniversary = Date.UTC(year, birthDate.getUTCMonth(), birthDate.getUTCDate())
  const start = new Date(anniversary + (week - 1) * millisecondsPerWeek)
  const end = new Date(start.getTime() + 6 * millisecondsPerDay)
  return { start, end }
}

const LifeInWeeks: QuartzComponentConstructor<LifeInWeeksOptions> = (userOptions) => {
  if (!userOptions?.birthDate) {
    throw new Error("LifeInWeeks requires a birthDate")
  }

  const options = { ...defaultOptions, ...userOptions }

  const Component: QuartzComponent = ({
    displayClass,
    fileData,
    allFiles,
  }: QuartzComponentProps) => {
    const birthDate = new Date(`${options.birthDate}T00:00:00Z`)
    const today = new Date()
    const birthYear = birthDate.getUTCFullYear()
    const currentYear = today.getUTCFullYear()
    const currentDate = Date.UTC(currentYear, today.getUTCMonth(), today.getUTCDate())
    const birthdayThisYear = Date.UTC(currentYear, birthDate.getUTCMonth(), birthDate.getUTCDate())
    let completedYears = currentYear - birthYear
    if (currentDate < birthdayThisYear) completedYears -= 1

    const lastBirthday = Date.UTC(
      birthYear + completedYears,
      birthDate.getUTCMonth(),
      birthDate.getUTCDate(),
    )
    const currentLifeWeek =
      completedYears < 0
        ? 1
        : Math.min(52, Math.floor((currentDate - lastBirthday) / millisecondsPerWeek) + 1)
    const currentLifeWeekIndex = Math.max(0, completedYears * 52 + currentLifeWeek - 1)

    const weeklyEntries = new Map<string, WeekEntry>()
    const entries: WeekEntry[] = []

    for (const file of allFiles) {
      const slug = file.slug as FullSlug | undefined
      const match = slug?.match(/^life\/week-(\d+)-(\d+)$/)
      if (!slug || !match) continue

      const [, weekText, yearText] = match
      const week = Number.parseInt(weekText, 10)
      const year = Number.parseInt(yearText, 10)
      if (week < 1 || week > 52) continue
      const frontmatterTitle = file.frontmatter?.title
      const frontmatterDescription = file.frontmatter?.description
      const entry: WeekEntry = {
        week,
        year,
        title: typeof frontmatterTitle === "string" ? frontmatterTitle : `Week ${week}, ${year}`,
        description:
          typeof frontmatterDescription === "string" ? frontmatterDescription : undefined,
        slug,
        url: resolveRelative(fileData.slug as FullSlug, slug),
      }

      weeklyEntries.set(`${year}-${week.toString().padStart(2, "0")}`, entry)
      entries.push(entry)
    }

    entries.sort((left, right) => right.year - left.year || right.week - left.week)

    const totalWeeks = options.lifeExpectancy * 52
    const weeksLived = Math.min(totalWeeks, currentLifeWeekIndex)
    const hasCurrentWeek = currentLifeWeekIndex < totalWeeks
    const weeksRemaining = Math.max(0, totalWeeks - weeksLived - (hasCurrentWeek ? 1 : 0))
    const rows = []

    for (let yearOffset = 0; yearOffset < options.lifeExpectancy; yearOffset++) {
      const year = birthYear + yearOffset
      const cells = [
        <div class="year-label" key={`label-${year}`}>
          {yearOffset % 5 === 0 ? yearOffset : ""}
        </div>,
      ]

      for (let week = 1; week <= 52; week++) {
        const { start, end } = getWeekDateRange(birthDate, yearOffset, week)
        const weekKey = `${year}-${week.toString().padStart(2, "0")}`
        const entry = weeklyEntries.get(weekKey)
        const hasEntry = entry !== undefined
        let state = "future"

        const lifeWeekIndex = yearOffset * 52 + week - 1
        if (lifeWeekIndex < weeksLived) {
          state = "lived"
        } else if (hasCurrentWeek && lifeWeekIndex === currentLifeWeekIndex) {
          state = "current"
        }

        cells.push(
          <div
            class={`week-cell ${state}${hasEntry ? " has-entry" : ""}`}
            key={weekKey}
            role={hasEntry ? "link" : undefined}
            tabIndex={hasEntry ? 0 : undefined}
            aria-label={hasEntry ? `Open ${entry.title}` : undefined}
            data-week={week}
            data-year={year}
            data-week-start={start.toISOString().split("T")[0]}
            data-week-end={end.toISOString().split("T")[0]}
            data-has-entry={hasEntry}
            data-entry-url={entry?.url}
            data-entry-title={entry?.title}
            data-entry-description={entry?.description}
          />,
        )
      }

      rows.push(
        <div class="life-row" key={`row-${year}`} style={{ display: "contents" }}>
          {cells}
        </div>,
      )
    }

    const entriesJson = JSON.stringify(
      entries.map(({ week, year, title, description, url }) => ({
        week,
        year,
        title,
        description: description ?? "",
        url,
      })),
    )

    return (
      <div class={classNames(displayClass, "life-in-weeks")} data-entries={entriesJson}>
        <h3>{options.title}</h3>
        <p class="life-subtitle">My life visualized in weeks. Each box is one week.</p>

        {entries.length > 0 && (
          <div class="event-navigator">
            <div class="nav-arrows">
              <button class="nav-arrow prev" aria-label="Previous entry">
                ▲
              </button>
              <button class="nav-arrow next" aria-label="Next entry">
                ▼
              </button>
            </div>
            <div class="event-display">
              <div class="event-title">
                <span class="event-week">Week {entries[0].week}</span>:{" "}
                <a href={entries[0].url} class="internal">
                  {entries[0].title}
                </a>
              </div>
              {entries[0].description && (
                <div class="event-description">{entries[0].description}</div>
              )}
            </div>
          </div>
        )}

        <div class="life-grid-container">
          <div class="life-grid">{rows}</div>
        </div>

        <div class="life-stats">
          <div class="stat">
            <span class="dot lived" />
            <span>{weeksLived.toLocaleString()} lived</span>
          </div>
          <div class="stat">
            <span class="dot current" />
            <span>This week</span>
          </div>
          <div class="stat">
            <span class="dot future" />
            <span>{weeksRemaining.toLocaleString()} remaining</span>
          </div>
        </div>

        <div class="life-tooltip" />
      </div>
    )
  }

  Component.css = style
  Component.afterDOMLoaded = script
  return Component
}

export default LifeInWeeks
