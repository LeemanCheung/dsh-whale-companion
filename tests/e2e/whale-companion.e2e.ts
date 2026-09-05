import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const bundle = readFileSync(resolve('packages/dsh-whale-companion/lib/client.js'), 'utf8')
const react = resolve('node_modules/react/umd/react.production.min.js')
const reactDom = resolve('node_modules/react-dom/umd/react-dom.production.min.js')
const captureArt = process.env.DSH_CAPTURE_ART === '1'

const fixture = {
  version: 5,
  name: '深蓝',
  xp: 8_050,
  level: 62,
  turns: 428,
  sessions: 96,
  tools: 173,
  streak: 12,
  longestStreak: 38,
  lastActiveDay: '2026-08-27',
  checkpoints: [],
  achievements: ['first-swim', 'ten-turns', 'century', 'week-current', 'level-five', 'level-ten', 'tool-diver', 'night-owl', 'steady-fin'],
  skin: 'aurora',
  species: 'blue',
  resonance: { blue: 420, 'common-minke': 180 },
  position: { x: .04, y: .08 },
  updatedAt: Date.UTC(2026, 7, 27, 12),
  moments: [
    { id: 'moment-a', progressDay: '2026-08-26', at: Date.UTC(2026, 7, 26, 10), category: 'level-up', species: 'blue', reactionId: 'blue-tide', templateId: 'focus-tide', visualSeed: 7 },
    { id: 'moment-b', progressDay: '2026-08-27', at: Date.UTC(2026, 7, 27, 9), category: 'session-start', species: 'blue', reactionId: 'blue-tide-2', templateId: 'focus-tide', visualSeed: 11 },
  ],
  monthlyTides: [],
  reactionCooldowns: [],
  collectibles: [
    { collectibleId: 'first-wake', variant: 0, earnedProgressDay: '2026-08-01' },
    { collectibleId: 'blue-current-lamp', variant: 0, earnedProgressDay: '2026-08-02' },
    { collectibleId: 'warm-coral', variant: 0, earnedProgressDay: '2026-08-03' },
    { collectibleId: 'echo-shell', variant: 0, earnedProgressDay: '2026-08-04' },
    { collectibleId: 'tide-map', variant: 0, earnedProgressDay: '2026-08-05' },
    { collectibleId: 'song-chime', variant: 0, earnedProgressDay: '2026-08-06' },
  ],
  room: {
    slots: { backdrop: 'tide-map', seafloor: null, lighting: 'blue-current-lamp', hanging: 'echo-shell', habitatLeft: 'warm-coral', habitatRight: null, foreground: 'first-wake', soundscape: 'song-chime' },
    presets: [],
  },
  expedition: { expeditionId: 'aurora-cove', species: 'blue', startedProgressDay: '2026-08-20', lastAdvancedProgressDay: '2026-08-27', progress: 5, goal: 7, rewardClaimed: false },
  storyFragments: [],
  community: { enabled: false, aliasId: 'blue-current', peers: [] },
}

async function mount(page: Page, initial = fixture): Promise<void> {
  await page.setContent(`
    <style>
      :root {
        color-scheme: dark;
        --dsw-alias-bg-base: #07111f;
        --dsw-alias-bg-layer-1: #0d1b2d;
        --dsw-alias-bg-layer-2: #14263b;
        --dsw-alias-label-primary: #f4f8ff;
        --dsw-alias-label-secondary: #adc0d8;
        --dsw-alias-label-tertiary: #7890aa;
        --dsw-alias-brand-primary: #5fc7ff;
        --dsw-alias-border-l1: rgba(164,199,232,.18);
        --dsw-alias-border-l2: rgba(164,199,232,.28);
        --dsw-alias-border-l3: rgba(164,199,232,.42);
        --dsw-alias-state-error-primary: #ff7c8b;
        --dsw-alias-state-success-primary: #58d6a9;
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; background: radial-gradient(circle at 70% 0, #12375b, #07111f 48%); color: var(--dsw-alias-label-primary); font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif; }
      #settings { width: min(1120px, calc(100% - 28px)); margin: 22px auto 80px; }
      #overlay { position: relative; z-index: 20; }
      @media (prefers-color-scheme: light) {
        :root {
          color-scheme: light;
          --dsw-alias-bg-base: #eef6fc;
          --dsw-alias-bg-layer-1: #ffffff;
          --dsw-alias-bg-layer-2: #e5f0f8;
          --dsw-alias-label-primary: #10243a;
          --dsw-alias-label-secondary: #48627b;
          --dsw-alias-label-tertiary: #6f879d;
          --dsw-alias-brand-primary: #147fbd;
          --dsw-alias-border-l1: rgba(29,80,118,.14);
          --dsw-alias-border-l2: rgba(29,80,118,.24);
          --dsw-alias-border-l3: rgba(29,80,118,.36);
        }
        html, body { background: radial-gradient(circle at 70% 0, #cce9fb, #eef6fc 48%); }
      }
    </style>
    <div id="overlay"></div>
    <main id="settings"></main>
  `)
  await page.addScriptTag({ path: react })
  await page.addScriptTag({ path: reactDom })
  await page.evaluate(() => {
    ;(window as any).__loadedWhaleModule = undefined
    ;(window as any).__ModuleLoader__ = { load(value: unknown) { ;(window as any).__loadedWhaleModule = value } }
  })
  await page.addScriptTag({ content: bundle })
  await page.evaluate(async initial => {
    const React = (window as any).React
    const ReactDOM = (window as any).ReactDOM
    const runtime = {
      Fragment: React.Fragment,
      jsx: (type: unknown, props: Record<string, unknown>, key?: string) => React.createElement(type, key === undefined ? props : { ...props, key }),
      jsxs: (type: unknown, props: Record<string, unknown>, key?: string) => React.createElement(type, key === undefined ? props : { ...props, key }),
    }
    const loaded = (window as any).__loadedWhaleModule
    const plugin = loaded.factory((id: string) => {
      if (id === 'react') return React
      if (id === 'react/jsx-runtime') return runtime
      return {}
    })
    let state = initial
    const ok = <T,>(value: T): Promise<{ ok: true, value: T }> => Promise.resolve({ ok: true, value })
    const raw = {
      getV5: () => ok(state),
      setName: (name: string) => { state = { ...state, name }; return ok(state) },
      setSkin: (skin: string) => { state = { ...state, skin }; return ok(state) },
      setPosition: (position: { x: number, y: number }) => { state = { ...state, position }; return ok(state) },
      setSpeciesV5: (species: string) => { state = { ...state, species }; return ok(state) },
      placeCollectibleV5: () => ok(state),
      saveRoomPresetV5: () => ok(state),
      loadRoomPresetV5: () => ok(state),
      startExpeditionV5: () => ok(state),
      claimExpeditionV5: () => ok(state),
      exportVisitorBottleV5: () => ok('{"format":"dsh-whale-visitor-bottle","version":1}'),
      importVisitorBottleV5: () => ok({ format: 'dsh-whale-visitor-bottle', version: 1, room: { skin: state.skin, species: state.species, slots: state.room.slots } }),
      setCommunityV5: () => ok(state),
      exportCommunitySongV5: () => ok('{"format":"dsh-whale-song","version":1}'),
      importCommunitySongV5: () => ok(state),
      removeCommunityPeerV5: () => ok(state),
      postcardV5: () => ok({ day: '2026-08-27', species: state.species, skin: state.skin, level: state.level, moments: state.moments.slice(-3), message: '鲸尾划开一条新的航线。' }),
      export: () => ok(JSON.stringify({ format: 'dsh-whale-companion', version: 5, state })),
      import: () => ok(state),
      reset: () => ok(state),
    }
    const slots: Record<string, { meta: any, Component: any }> = {}
    const ctx = {
      remote: { $mount: async () => async () => undefined },
      get: (name: string) => name === 'remote.whaleCompanion' ? raw : undefined,
      slots: {
        inject: (_name: string, register: () => unknown) => register(),
        register: (meta: any, Component: any) => { slots[meta.id] = { meta, Component }; return () => undefined },
      },
    }
    await plugin.apply(ctx)
    const settings = slots['whale-home']
    const overlay = slots['whale-companion']
    ReactDOM.createRoot(document.getElementById('settings')).render(React.createElement(settings.Component, settings.meta.inject()))
    ReactDOM.createRoot(document.getElementById('overlay')).render(React.createElement(overlay.Component, overlay.meta.inject()))
  }, initial)
  await expect(page.getByRole('heading', { name: '鲸鱼小屋' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '伙伴档案与动态航线' })).toBeVisible()
}

test('renders the integrated planned dashboard and quick card', async ({ page }) => {
  await mount(page)
  const hero = page.getByRole('heading', { name: '鲸鱼小屋' }).locator('xpath=ancestor::header[1]')
  await expect(hero.locator('[data-raster-art]')).toBeVisible()
  expect(await hero.locator('svg').count()).toBe(0)
  if (captureArt) await hero.screenshot({ path: resolve('docs/whale-home-hero-dark.png') })
  if (captureArt) {
    const settingsBox = await page.locator('#settings').boundingBox()
    if (settingsBox !== null) await page.screenshot({ path: resolve('assets/screenshots/overview.png'), clip: { x: settingsBox.x, y: settingsBox.y, width: settingsBox.width, height: Math.min(1040, settingsBox.height) } })
    await page.getByRole('heading', { name: '鲸灵图鉴' }).locator('xpath=ancestor::section[1]').screenshot({ path: resolve('assets/screenshots/atlas.png') })
    await page.getByRole('heading', { name: '海域主题' }).locator('xpath=ancestor::section[1]').screenshot({ path: resolve('assets/screenshots/customize.png') })
  }
  const planned = page.getByRole('heading', { name: '伙伴档案与动态航线' }).locator('xpath=ancestor::section[1]')
  await expect(planned.locator('[data-raster-art]').first()).toBeVisible()
  expect(await planned.locator('svg').count()).toBe(0)
  if (captureArt) await planned.screenshot({ path: resolve('docs/planned-dashboard-dark.png') })
  const whale = page.getByRole('button', { name: /快速航行卡/ })
  await whale.click()
  await expect(page.getByLabel('鲸鱼伙伴快速航行卡')).toBeVisible()
  if (captureArt) await page.getByLabel('鲸鱼伙伴快速航行卡').screenshot({ path: resolve('docs/quick-card-dark.png') })
  await page.getByLabel('伙伴名字').fill('星潮')
  await page.getByRole('button', { name: '保存名字' }).click()
  await expect(page.getByText('已将鲸鱼伙伴命名为“星潮”。')).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载 PNG 名片' }).click()
  await download
  const postcardDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载潮汐明信片（PNG）' }).click()
  expect((await postcardDownload).suggestedFilename()).toMatch(/^whale-tide-.*\.png$/u)
})

test('keeps the planned dashboard polished on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mount(page)
  const planned = page.getByRole('heading', { name: '伙伴档案与动态航线' }).locator('xpath=ancestor::section[1]')
  const hero = page.getByRole('heading', { name: '鲸鱼小屋' }).locator('xpath=ancestor::header[1]')
  expect(await planned.locator('svg').count()).toBe(0)
  if (captureArt) await planned.screenshot({ path: resolve('docs/planned-dashboard-mobile.png') })
  if (captureArt) await hero.screenshot({ path: resolve('docs/whale-home-hero-mobile.png') })
})

test('honours light theme and reduced motion', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await mount(page)
  const planned = page.getByRole('heading', { name: '伙伴档案与动态航线' }).locator('xpath=ancestor::section[1]')
  const hero = page.getByRole('heading', { name: '鲸鱼小屋' }).locator('xpath=ancestor::header[1]')
  await expect(planned.locator('[data-raster-art]').first()).toBeVisible()
  expect(await planned.locator('svg').count()).toBe(0)
  if (captureArt) await planned.screenshot({ path: resolve('docs/planned-dashboard-light-reduced.png') })
  if (captureArt) await hero.screenshot({ path: resolve('docs/whale-home-hero-light-reduced.png') })
})

test('renders continuous minke motion over a static ocean layer', async ({ page }) => {
  await mount(page, { ...fixture, species: 'common-minke' })
  const card = page.getByLabel('当前同行鲸灵：小须鲸')
  await expect(card).toBeVisible()
  const stage = card.locator(':scope > span').first()
  const sprite = stage.locator(':scope > span')
  const stageBefore = await stage.evaluate(element => getComputedStyle(element).backgroundImage)
  const start = await sprite.evaluate(element => {
    const style = getComputedStyle(element)
    return { animationName: style.animationName, backgroundImage: style.backgroundImage, backgroundPosition: style.backgroundPosition }
  })
  expect(start.backgroundImage).toContain('data:image/webp;base64,')
  if (process.env.DSH_CAPTURE_MINKE === '1') await card.screenshot({ path: resolve('docs/minke-card-dark.png') })
  const firstPixels = await stage.screenshot()
  await page.waitForTimeout(420)
  const secondPixels = await stage.screenshot()
  expect(secondPixels.equals(firstPixels)).toBe(false)
  expect(await stage.evaluate(element => getComputedStyle(element).backgroundImage)).toBe(stageBefore)
})

test('freezes the minke card when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await mount(page, { ...fixture, species: 'common-minke' })
  const card = page.getByLabel('当前同行鲸灵：小须鲸')
  const sprite = card.locator(':scope > span').first().locator(':scope > span')
  const before = await sprite.evaluate(element => {
    const style = getComputedStyle(element)
    return { animationName: style.animationName, backgroundPosition: style.backgroundPosition, backgroundImage: style.backgroundImage }
  })
  await page.waitForTimeout(420)
  const after = await sprite.evaluate(element => getComputedStyle(element).backgroundPosition)
  expect(before.animationName).toBe('none')
  expect(before.backgroundImage).toContain('data:image/png;base64,')
  expect(after).toBe(before.backgroundPosition)
  if (process.env.DSH_CAPTURE_MINKE === '1') await card.screenshot({ path: resolve('docs/minke-card-light-reduced.png') })
})

test('keeps the minke motion card inside a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mount(page, { ...fixture, species: 'common-minke' })
  const card = page.getByLabel('当前同行鲸灵：小须鲸')
  const box = await card.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(390)
  if (process.env.DSH_CAPTURE_MINKE === '1') await card.screenshot({ path: resolve('docs/minke-card-mobile.png') })
})

test('stops native WebP motion for the saved in-product preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await mount(page, { ...fixture, species: 'common-minke' })
  const card = page.getByLabel('当前同行鲸灵：小须鲸')
  const sprite = card.locator(':scope > span').first().locator(':scope > span')
  await page.getByLabel('减少视觉动效', { exact: true }).check()
  await expect.poll(() => sprite.evaluate(element => getComputedStyle(element).backgroundImage)).toContain('data:image/png;base64,')
  const before = await card.screenshot()
  await page.waitForTimeout(450)
  expect((await card.screenshot()).equals(before)).toBe(true)
  await page.getByLabel('减少视觉动效', { exact: true }).uncheck()
  await expect.poll(() => sprite.evaluate(element => getComputedStyle(element).backgroundImage)).toContain('data:image/webp;base64,')
})
