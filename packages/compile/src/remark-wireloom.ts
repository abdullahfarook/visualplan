import { visit } from 'unist-util-visit'
import { render } from 'wireloom'

interface MdastCode {
  type: 'code'
  lang?: string | null
  value: string
}

interface MdastParent {
  children: unknown[]
}

/**
 * Convert ```wireloom fenced code blocks into `<Svg svg="..." />` MDX JSX elements. Wireloom's render
 * is async, so the SVGs are produced here at build time (remark transformers may be async) and the
 * existing Svg component only frames them. Both a light and a dark render are inlined, and theme.css
 * shows the one matching the page scheme. A source that fails to parse becomes an `error` attribute,
 * shown in place like any Svg error.
 */
export function remarkWireloom() {
  return async (tree: unknown) => {
    const targets: { node: MdastCode; index: number; parent: MdastParent }[] = []
    visit(
      tree as never,
      'code',
      (node: MdastCode, index: number | undefined, parent: MdastParent | undefined) => {
        if (node.lang === 'wireloom' && parent && index !== undefined) {
          targets.push({ node, index, parent })
        }
      },
    )
    await Promise.all(
      targets.map(async ({ node, index, parent }, i) => {
        let result: { name: string; value: string }
        try {
          const light = await render(`vp-wireloom-${i}`, node.value, { theme: 'default' })
          const dark = await render(`vp-wireloom-${i}-dark`, node.value, { theme: 'dark' })
          result = {
            name: 'svg',
            value: `<span class="vp-wl-light">${light.svg}</span><span class="vp-wl-dark">${dark.svg}</span>`,
          }
        } catch (error) {
          result = { name: 'error', value: error instanceof Error ? error.message : String(error) }
        }
        parent.children[index] = {
          type: 'mdxJsxFlowElement',
          name: 'Svg',
          attributes: [
            { type: 'mdxJsxAttribute', name: 'src', value: 'wireframe' },
            { type: 'mdxJsxAttribute', name: 'title', value: 'Wireframe' },
            { type: 'mdxJsxAttribute', ...result },
          ],
          children: [],
        }
      }),
    )
  }
}
