import * as React from 'react'
import type { WhaleSpeciesDefinition } from '../species.ts'
import { speciesArtStyle } from './asset-styles.ts'
import { INK_WHALE_MOTION, INK_WHALE_STILL } from './ink-whale-sprite.ts'
import styles from './Whale.module.css'


export function SpeciesMotionCard({ species }: { species: WhaleSpeciesDefinition }): React.ReactElement {
  const animated = species.id === 'common-minke'
  return React.createElement('article', {
    className: styles.motionCard,
    'data-motion': animated ? 'true' : 'false',
    'aria-label': `当前同行鲸灵：${species.nameZh}`,
  },
  React.createElement('span', { className: styles.motionStage, 'data-ink': animated ? 'true' : undefined, 'aria-hidden': true },
    animated
      ? React.createElement('span', { className: styles.minkeSprite, style: { backgroundImage: `url(${INK_WHALE_MOTION})`, '--ink-whale-still': `url(${INK_WHALE_STILL})` } as React.CSSProperties })
      : React.createElement('span', { className: styles.motionFallback, style: speciesArtStyle(species) }),
  ),
  React.createElement('span', { className: styles.motionCopy },
    React.createElement('small', null, '当前同行鲸灵'),
    React.createElement('strong', null, species.nameZh),
    React.createElement('span', null, species.nameEn),
    React.createElement('p', null, animated ? '躯干、胸鳍与尾部形成连续游动；海水背景保持静止。' : species.story),
  ))
}
