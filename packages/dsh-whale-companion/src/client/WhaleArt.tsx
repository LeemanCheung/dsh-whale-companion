import * as React from 'react'
import type { WhaleSkin } from '../types.ts'
import type { WhaleSpeciesDefinition } from '../species.ts'
import { SKINS } from './catalog.ts'
import { speciesArtStyle } from './asset-styles.ts'
import { INK_WHALE_MOTION, INK_WHALE_STILL } from './ink-whale-sprite.ts'
import styles from './Planned.module.css'

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

export function WhaleArt({ species, skin, compact = false, className, title }: WhaleArtProps): React.ReactElement {
  const animated = species.id === 'common-minke'
  const classNames = [
    styles.whaleArt,
    compact ? styles.whaleArtCompact : '',
    animated ? styles.whaleArtAnimated : '',
    className ?? '',
  ].filter(Boolean).join(' ')
  const artStyle = animated
    ? { backgroundImage: `url(${INK_WHALE_MOTION})`, '--ink-whale-still': `url(${INK_WHALE_STILL})`, ...skinPaletteStyle(skin) }
    : { ...speciesArtStyle(species), ...skinPaletteStyle(skin) }
  return React.createElement('span', {
    className: classNames,
    style: artStyle,
    'data-raster-art': animated ? 'imagegen-animation' : 'imagegen-species',
    role: title === undefined ? undefined : 'img',
    'aria-label': title,
    'aria-hidden': title === undefined,
  })
}
