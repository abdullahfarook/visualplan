# Wireloom reference (` ```wireloom ` fences)

Condensed from the official Wireloom agent guide (https://github.com/StardockCorp/Wireloom, `AGENTS.md`,
MIT, v0.7). Wireloom is a small indentation-based DSL that renders a monochrome, sketch-style UI
wireframe as inline SVG. Static structure only: for a flow or architecture use mermaid; for a working
UI write the real component.

## Hard rules

- Exactly one root: `window:` or `window "Title":`. Nothing but `annotation` lines may sit beside it.
- Indent with 2 or 4 spaces, locked per fence (the first indented line decides). Tabs are a parse error.
- A line ending in `:` opens a children block; a line without `:` is a leaf and takes no children.
- Strings use double quotes. Numbers take `px`/`%`/`fr` where allowed. Flags are bare words (`primary`).
- `#` lines and blank lines are comments.
- Emit the fenced block; never describe the layout in prose or draw it as ASCII art.
- Unknown attributes/flags on the wrong primitive are parse errors, and `vplan check` reports them as
  `file:line:col`. Run `check` after writing a wireframe.
- Pick the specific primitive: `toggle`/`checkbox`/`radio` for controls (not `kv`), `tree`+`node` for file
  trees (not nested `list`), `menubar`+`menu`+`menuitem` for menus (`item` is only for `list`).
- The page shows a light and a dark render automatically; do not try to theme it.
- **Icons: rare, and OS-native emoji rather than `icon=`.** Add an icon only where it carries meaning the
  text does not: tab bar and nav items (`tabitem "🏠 Home"`, `backbutton`), **icon-only buttons** (`button "🔍"`,
  `button "⚙️"`, `button "➕"`, where the glyph is the whole label and no text fits), and status markers
  (`text "✅ Deployed"`, `chip "⚠️ Blocked"`). **When in doubt, no icon.** Never put one on every row, checkbox,
  list item, filter button, section title, or window title; a screen where most labels carry an emoji reads as
  noise. Prefer emoji to `icon=`: `icon=` only knows the built-in names below and anything else draws a boxed
  first letter, whereas an emoji renders in the viewer's system emoji font (colour, and the look varies by OS).
  Use `icon=` only for a listed name when a monochrome glyph is wanted. One emoji per label at most.

## Containers

| Primitive | Notes |
|---|---|
| `window ["Title"]` | Root. |
| `header` / `footer` | Top / bottom chrome band. `header large:` is a tall large-title band. |
| `panel` | Dashed bordered content box. |
| `section "Title"` | Labeled container. `badge="4/7"`, `accent=`. |
| `tabs` > `tab "Label"` | `active`, `badge=`. |
| `row` | Horizontal flow. `align=left\|center\|right`, `justify=start\|between\|around\|end`. |
| `col [px\|fill]` | Vertical flow inside a `row`; bare `col:` fills the remaining width. |
| `list` > `item "text"` / `slot "Title"` | `slot` is a titled card: `active`, `state=`, `accent=`, optional `footer:` child. `chevron` flag adds a disclosure arrow. |
| `grid cols=N rows=M` > `cell ["label"]` | `row=`/`col=` place explicitly; `state=`, `accent=`. |
| `resourcebar` > `resource name= value=` | Game-style header strip. |
| `stats` > `stat "LABEL" "value"` | Inline stat strip. |
| `navbar` > `leading:` / `trailing:` | Mobile top bar. Direct child of `window`, exclusive with `header`. |
| `tabbar` > `tabitem "Label" icon= badge=` | Mobile bottom bar (`selected`, `disabled`). Exclusive with `footer`. |
| `sheet [title=""] [position=bottom\|center]` | Modal overlay, one per window, direct child of `window`. |
| `segmented` > `segment "Label"` | Pill filter, exactly one `selected`. |

## Leaves

`text "..."` (`bold`, `italic`, `muted`, `size=small|regular|large`, `weight=`, `accent=`),
`button "Label"` (`primary`, `disabled`, `badge=`, `accent=`, `icon=`; empty label plus `icon=` is icon-only),
`input` (`placeholder=`, `type=`, `disabled`; **no positional label**, use `input placeholder="Email"`),
`combo ["label"]` (`value=`, `options=`), `slider range=0-100 value=40 [label=]`,
`kv "Label" "value"` (`icon=`, `accent=`), `image [label= width= height=]`, `icon name=...`, `divider`,
`progress value= max= [label=]`, `chart kind=bar|line|pie [label=]` (placeholder shape, no data),
`checkbox` (`checked`), `radio` (`selected`, `group=`), `toggle` (`on`/`off`) (all: `disabled`, `label-right`),
`tree` > `node "Label"` (`collapsed`, `selected`, `icon=`), `menubar` > `menu "Title"` > `menuitem "Label"` (`shortcut=`, `disabled`) / `separator`,
`breadcrumb` > `crumb "Label"`, `chip "Label"` (`closable`, `selected`, `accent=`, `icon=`),
`avatar "BW"` (`size=small|medium|large`), `spinner ["label"]`, `status "Label" kind=success|info|warning|error`,
`backbutton "Parent"`, `spacer` (only inside a `row`; pushes siblings apart).

Accents: `research military industry wealth approval warning danger success`. Icons: `credits research
military industry influence approval faith authority computation tech policy ship planet leader gear
warning lock check star plus minus` (unknown names fall back to a boxed letter, so use an emoji in the label instead, and only where the rule above allows an icon).

Every primitive accepts `id="..."`, used only as an annotation target.

## Annotations (callouts)

Only when the plan wants labels pointing at parts of the screen. Top level, after the `window` block, at
indent 0; `target` (an `id`) and `position` are both required:

    annotation "Primary action.\nDisabled until valid." target="signin-btn" position=right

`position` is `left|right|top|bottom`; keep related callouts on one side. An unmatched `target` is
silently dropped. Do not invent annotations for a plain wireframe.

## Example

```wireloom
window "Sign in":
  header:
    text "Welcome back" bold size=large id="welcome"
  panel:
    input placeholder="Email" type=email id="email-field"
    input placeholder="Password" type=password
    row align=right:
      button "Forgot?"
      button "Sign in" primary id="signin-btn"
  footer:
    text "No account? Sign up" muted

annotation "Greeting" target="welcome" position=top
annotation "Primary action" target="signin-btn" position=right
```

Mobile patterns: list screen = `header large:` + `input placeholder="Search"` + `list` of `slot ... chevron`
+ `tabbar`; detail = `navbar` (`leading: backbutton`, `trailing: button`) + `header large:`; edit =
`navbar` (Cancel / Done) + form panel; confirm = `sheet position=center title="..."` over the screen.
