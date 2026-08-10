import { RecentNotes, type RecentNotesOptions } from "@quartz-community/recent-notes"
import * as Component from "./quartz/components"
import * as Plugin from "./quartz/plugins"
import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import LifeInWeeks from "./custom/life-in-weeks/LifeInWeeks"

const config = await loadQuartzConfig()
const layout = await loadQuartzLayout()

const recentWritingOptions: Partial<RecentNotesOptions> = {
  title: "Recent Writing",
  limit: 3,
  showTags: false,
  linkToMore: "tags/evergreen",
  filter: (file) => {
    const tags = file.frontmatter?.tags
    return Array.isArray(tags) && tags.includes("evergreen")
  },
}

const recentNotesOptions: Partial<RecentNotesOptions> = {
  title: "Recent Notes",
  limit: 3,
  showTags: false,
  linkToMore: "tags/seedling",
  filter: (file) => {
    const tags = file.frontmatter?.tags
    return Array.isArray(tags) && (tags.includes("seedling") || tags.includes("budding"))
  },
}

const recentWriting = RecentNotes(recentWritingOptions)
const recentNotes = RecentNotes(recentNotesOptions)

for (const pageType of ["content", "folder", "tag"]) {
  const pageLayout = layout.byPageType[pageType]
  if (!pageLayout) continue

  pageLayout.left = [
    ...(pageLayout.left ?? layout.defaults.left ?? []),
    Component.DesktopOnly(recentWriting),
    Component.DesktopOnly(recentNotes),
  ]
  pageLayout.right = [
    ...(pageLayout.right ?? layout.defaults.right ?? []),
    Component.MobileOnly(recentWriting),
    Component.MobileOnly(recentNotes),
  ]
}

const folderLayout = layout.byPageType.folder
if (folderLayout) {
  folderLayout.beforeBody = [
    ...(folderLayout.beforeBody ?? layout.defaults.beforeBody ?? []),
    Component.ConditionalRender({
      component: LifeInWeeks({
        birthDate: "1998-07-22",
        lifeExpectancy: 80,
        title: "Life in Weeks",
      }),
      condition: ({ fileData }) => {
        const slug = fileData.slug
        return typeof slug === "string" && (slug === "life" || slug.startsWith("life/"))
      },
    }),
  ]
}

// The YAML loader creates its dispatcher before these TypeScript layout overrides are applied.
config.plugins.emitters = [
  ...config.plugins.emitters.filter((emitter) => emitter.name !== "PageTypeDispatcher"),
  Plugin.PageTypes.PageTypeDispatcher({
    defaults: layout.defaults,
    byPageType: layout.byPageType,
  }),
]

export default config
export { layout }
