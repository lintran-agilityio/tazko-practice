import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const declarations = (css: string): [string, string][] =>
  [...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()])

describe('design tokens', () => {
  const design = declarations(readFileSync('design/tokens.css', 'utf8'))
  const app = new Map(declarations(readFileSync('src/index.css', 'utf8')))

  it('has every token from design/tokens.css with the same value', () => {
    expect(design.length).toBeGreaterThan(20)
    for (const [name, value] of design) {
      expect(app.get(name), name).toBe(value)
    }
  })

  it('self-hosts both fonts with @fontsource', () => {
    const css = readFileSync('src/index.css', 'utf8')
    expect(css).toContain('@fontsource/hanken-grotesk/')
    expect(css).toContain('@fontsource/dm-mono/')
  })
})
