import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const config = readFileSync(new URL('../config.jsonc', import.meta.url), 'utf8')

describe('auth password rules (security review)', () => {
  it('requires at least 6 characters with lower, upper, digit and symbol', () => {
    expect(config).toMatch(/"minimum_password_length":\s*6\b/)
    expect(config).toMatch(/"password_requirements":\s*"lower_upper_letters_digits_symbols"/)
  })

  it('keeps public signup off', () => {
    expect(config).toMatch(/"enable_signup":\s*false/)
  })
})
