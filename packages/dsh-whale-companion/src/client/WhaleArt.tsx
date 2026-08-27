import * as React from 'react'
import type { WhaleSkin } from '../types.ts'
import type { WhaleSpeciesDefinition } from '../species.ts'
import { SKINS } from './catalog.ts'
import styles from './Planned.module.css'

export type SpeciesMark = 'clean' | 'spots' | 'stripes' | 'saddle' | 'constellation' | 'tusk'

export type WhaleArtProps = Readonly<{
  species: WhaleSpeciesDefinition
  skin: WhaleSkin
  compact?: boolean
  className?: string
  title?: string
}>

export function skinPaletteStyle(skin: WhaleSkin): React.CSSProperties {
  const palette = SKINS[skin]
  return {
    '--whale-main': palette.color,
    '--whale-deep': palette.deep,
    '--whale-belly': palette.belly,
    '--whale-accent': palette.accent,
    '--whale-glow': palette.glow,
  } as React.CSSProperties
}

export function speciesMark(species: WhaleSpeciesDefinition): SpeciesMark {
  if (species.id === 'narwhal') return 'tusk'
  if (species.id === 'orca' || species.id === 'pilot') return 'saddle'
  if (species.rarity === 'UR' || species.id === 'bowhead') return 'constellation'
  if (species.id.includes('right') || species.id === 'gray' || species.id === 'omura') return 'spots'
  if (species.id === 'fin' || species.id === 'sei' || species.id === 'brydes') return 'stripes'
  return 'clean'
}

export function WhaleArt({ species, skin, compact = false, className, title }: WhaleArtProps): React.ReactElement {
  const id = React.useId().replaceAll(':', '')
  const gradient = `whale-gradient-${id}`
  const glow = `whale-glow-${id}`
  const mark = speciesMark(species)
  return (
    <svg
      viewBox="0 0 240 150"
      className={[styles.whaleArt, compact ? styles.whaleArtCompact : '', className ?? ''].filter(Boolean).join(' ')}
      style={skinPaletteStyle(skin)}
      data-mark={mark}
      role={title === undefined ? undefined : 'img'}
      aria-label={title}
      aria-hidden={title === undefined}
      focusable="false"
    >
      <defs>
        <linearGradient id={gradient} x1="38" y1="27" x2="196" y2="126" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--whale-accent)" />
          <stop offset=".48" stopColor="var(--whale-main)" />
          <stop offset="1" stopColor="var(--whale-deep)" />
        </linearGradient>
        <radialGradient id={glow} cx="0" cy="0" r="1" gradientTransform="translate(128 78) rotate(90) scale(68 104)" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--whale-glow)" stopOpacity=".38" />
          <stop offset="1" stopColor="var(--whale-glow)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse className={styles.whaleAura} cx="128" cy="84" rx="104" ry="62" fill={`url(#${glow})`} />
      <g className={styles.whaleBubbles} aria-hidden="true">
        <circle className={styles.whaleBubbleOne} cx="185" cy="30" r="5" />
        <circle className={styles.whaleBubbleTwo} cx="199" cy="18" r="3" />
        <circle className={styles.whaleBubbleThree} cx="173" cy="17" r="2.5" />
      </g>
      <g className={styles.whaleTail}>
        <path d="M48 83C27 71 16 60 13 42c18 4 32 13 43 28 1-20 12-33 29-40 3 20-4 38-25 53Z" fill="var(--whale-deep)" />
        <path d="M56 77C35 76 22 81 11 96c19 5 37 2 51-11Z" fill="var(--whale-main)" opacity=".92" />
      </g>
      <path className={styles.whaleBodyShape} d="M48 73c18-31 56-48 101-43 39 4 70 22 76 45 7 29-19 48-61 50-32 2-57-6-77-20-13-9-27-10-44-5 9-9 14-18 15-27Z" fill={`url(#${gradient})`} />
      <path className={styles.whaleBelly} d="M91 101c28 13 74 13 103-4-13 24-43 31-75 26-15-2-25-9-28-22Z" fill="var(--whale-belly)" opacity=".84" />
      <path className={styles.whaleFin} d="M122 105c-9 20-3 33 12 39 6-18 14-28 31-35-16-6-29-7-43-4Z" fill="var(--whale-deep)" opacity=".96" />
      <path className={styles.whaleSmile} d="M186 91c10 7 20 7 30 1" fill="none" stroke="var(--whale-deep)" strokeWidth="3" strokeLinecap="round" opacity=".7" />
      <g className={styles.whaleEye}>
        <circle cx="190" cy="68" r="5.4" fill="var(--whale-deep)" />
        <circle cx="192" cy="66" r="1.8" fill="var(--whale-belly)" />
      </g>
      {mark === 'spots' && (
        <g className={styles.whaleMarkings} fill="var(--whale-belly)" opacity=".45">
          <circle cx="102" cy="55" r="7" /><circle cx="126" cy="47" r="4" /><circle cx="82" cy="69" r="4.5" />
        </g>
      )}
      {mark === 'stripes' && (
        <g className={styles.whaleMarkings} fill="none" stroke="var(--whale-belly)" strokeWidth="4" strokeLinecap="round" opacity=".42">
          <path d="M95 46c-4 14-3 27 3 40" /><path d="M113 40c-4 15-2 29 4 42" /><path d="M131 38c-2 15 1 27 8 39" />
        </g>
      )}
      {mark === 'saddle' && <path className={styles.whaleMarkings} d="M122 37c20-2 39 2 52 10-11 5-20 13-25 24-11-12-19-22-27-34Z" fill="var(--whale-belly)" opacity=".82" />}
      {mark === 'constellation' && (
        <g className={styles.whaleMarkings} fill="var(--whale-belly)" stroke="var(--whale-belly)" opacity=".72">
          <path d="M91 61l22-12 20 16 22-18" fill="none" strokeWidth="1.4" />
          <circle cx="91" cy="61" r="3" /><circle cx="113" cy="49" r="2.5" /><circle cx="133" cy="65" r="3" /><circle cx="155" cy="47" r="2.5" />
        </g>
      )}
      {mark === 'tusk' && <path className={styles.whaleTusk} d="M216 70 239 53 221 79Z" fill="var(--whale-belly)" stroke="var(--whale-accent)" strokeWidth="1.5" />}
      <path className={styles.whaleHighlight} d="M80 51c25-19 65-22 96-9" fill="none" stroke="var(--whale-belly)" strokeWidth="5" strokeLinecap="round" opacity=".28" />
    </svg>
  )
}
