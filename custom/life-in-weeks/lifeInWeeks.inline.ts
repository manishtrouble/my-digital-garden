interface LifeEntry {
  week: number
  year: number
  title: string
  description: string
  url: string
}

function setupLifeInWeeks(): void {
  const containers = document.querySelectorAll<HTMLElement>(".life-in-weeks")

  for (const container of containers) {
    const tooltip = container.querySelector<HTMLElement>(".life-tooltip")
    const grid = container.querySelector<HTMLElement>(".life-grid")
    const previousButton = container.querySelector<HTMLButtonElement>(".nav-arrow.prev")
    const nextButton = container.querySelector<HTMLButtonElement>(".nav-arrow.next")
    const eventTitle = container.querySelector<HTMLElement>(".event-title")
    const eventDescription = container.querySelector<HTMLElement>(".event-description")
    const eventWeek = container.querySelector<HTMLElement>(".event-week")
    const entries: LifeEntry[] = JSON.parse(container.dataset.entries ?? "[]")
    let currentEntryIndex = 0

    const updateEventDisplay = (): void => {
      const entry = entries[currentEntryIndex]
      if (!entry) return

      if (eventWeek) eventWeek.textContent = `Week ${entry.week}`

      const link = eventTitle?.querySelector<HTMLAnchorElement>("a")
      if (link) {
        link.textContent = entry.title
        link.href = entry.url
      }

      if (eventDescription) {
        eventDescription.textContent = entry.description
        eventDescription.style.display = entry.description ? "block" : "none"
      }

      container
        .querySelector<HTMLElement>(".week-cell.highlighted")
        ?.classList.remove("highlighted")
      const highlightedCell = container.querySelector<HTMLElement>(
        `.week-cell[data-week="${entry.week}"][data-year="${entry.year}"]`,
      )
      highlightedCell?.classList.add("highlighted")
      highlightedCell?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      })
    }

    if (previousButton && entries.length > 0) {
      const showPrevious = (): void => {
        currentEntryIndex = (currentEntryIndex - 1 + entries.length) % entries.length
        updateEventDisplay()
      }
      previousButton.addEventListener("click", showPrevious)
      window.addCleanup(() => previousButton.removeEventListener("click", showPrevious))
    }

    if (nextButton && entries.length > 0) {
      const showNext = (): void => {
        currentEntryIndex = (currentEntryIndex + 1) % entries.length
        updateEventDisplay()
      }
      nextButton.addEventListener("click", showNext)
      window.addCleanup(() => nextButton.removeEventListener("click", showNext))
    }

    if (tooltip && grid) {
      const cellForEvent = (event: Event): HTMLElement | null => {
        const target = event.target
        if (!(target instanceof Element)) return null
        const cell = target.closest<HTMLElement>(".week-cell")
        return cell && grid.contains(cell) ? cell : null
      }

      const hideTooltip = (): void => tooltip.classList.remove("visible")
      const positionTooltip = (event: MouseEvent): void => {
        const margin = 10
        const left = Math.max(
          margin,
          Math.min(event.clientX + margin, window.innerWidth - tooltip.offsetWidth - margin),
        )
        const top = Math.max(
          margin,
          Math.min(event.clientY + margin, window.innerHeight - tooltip.offsetHeight - margin),
        )
        tooltip.style.left = `${left}px`
        tooltip.style.top = `${top}px`
      }
      const showTooltip = (event: MouseEvent): void => {
        const cell = cellForEvent(event)
        if (!cell) {
          hideTooltip()
          return
        }

        const { weekStart, weekEnd, week, year, hasEntry, entryTitle } = cell.dataset
        if (!weekStart || !weekEnd) return

        const entryText = hasEntry === "true" && entryTitle ? `\nEntry: ${entryTitle}` : ""
        tooltip.textContent = `Week ${week}, ${year}\n${weekStart} – ${weekEnd}${entryText}`
        tooltip.classList.add("visible")
        positionTooltip(event)
      }
      const openEntry = (event: MouseEvent | KeyboardEvent): void => {
        if (event instanceof KeyboardEvent && event.key !== "Enter" && event.key !== " ") return

        const entryUrl = cellForEvent(event)?.dataset.entryUrl
        if (!entryUrl) return
        event.preventDefault()
        window.location.href = entryUrl
      }

      grid.addEventListener("mouseover", showTooltip)
      grid.addEventListener("mousemove", positionTooltip)
      grid.addEventListener("mouseleave", hideTooltip)
      grid.addEventListener("click", openEntry)
      grid.addEventListener("keydown", openEntry)
      window.addCleanup(() => {
        grid.removeEventListener("mouseover", showTooltip)
        grid.removeEventListener("mousemove", positionTooltip)
        grid.removeEventListener("mouseleave", hideTooltip)
        grid.removeEventListener("click", openEntry)
        grid.removeEventListener("keydown", openEntry)
      })
    }

    if (entries.length > 0) updateEventDisplay()
  }
}

document.addEventListener("nav", setupLifeInWeeks)
document.addEventListener("render", setupLifeInWeeks)
