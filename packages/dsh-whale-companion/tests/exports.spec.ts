import { describe, expect, it } from 'vitest'
import { createPostcardSvg, unsafeSvgReason } from '../src/client/exports.ts'
import type { WhalePostcard } from '../src/reducer.ts'

const postcard: WhalePostcard = {
  day: '2026-08-21', species: 'common-minke', skin: 'ocean', level: 9, message: '<script>alert(1)</script>',
  moments: [{ id: 'moment-one', progressDay: '2026-08-21', at: 1, category: 'level-up', species: 'common-minke', reactionId: 'common-minke-tide', templateId: 'launch-tide', visualSeed: 1 }],
}

describe('safe whale SVG exports', () => {
  it('escapes dynamic text and emits no resource-capable SVG features', () => {
    const svg = createPostcardSvg(postcard)
    expect(svg).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(svg).not.toContain('<script>')
    expect(unsafeSvgReason(svg)).toBeUndefined()
  })

  it('rejects scripts, foreign objects, event attributes, links, CSS URLs, and control characters', () => {
    expect(unsafeSvgReason('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>')).toBe('element')
    expect(unsafeSvgReason('<svg xmlns="http://www.w3.org/2000/svg"><foreignObject/></svg>')).toBe('element')
    expect(unsafeSvgReason('<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="x"/></svg>')).toBe('event-attribute')
    expect(unsafeSvgReason('<svg xmlns="http://www.w3.org/2000/svg"><image href="data:x"/></svg>')).toBe('resource-reference')
    expect(unsafeSvgReason('<svg xmlns="http://www.w3.org/2000/svg"><style>x{fill:url(x)}</style></svg>')).toBe('css-url')
    expect(unsafeSvgReason('<svg xmlns="http://www.w3.org/2000/svg">\u0001</svg>')).toBe('control-character')
  })
})
