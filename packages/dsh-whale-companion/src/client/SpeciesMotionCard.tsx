import * as React from 'react'
import type { WhaleSpeciesDefinition } from '../species.ts'
import { speciesArtStyle } from './asset-styles.ts'
import { MINKE_SWIM_SPRITE } from './minke-swim-sprite.ts'
import styles from './Whale.module.css'


export function SpeciesMotionCard({ species }: { species: WhaleSpeciesDefinition }): React.ReactElement {
  const animated = species.id === 'common-minke'
  return React.createElement('article', {
    className: styles.motionCard,
    'data-motion': animated ? 'true' : 'false',
    'aria-label': `当前同行鲸灵：${species.nameZh}`,
  },
  React.createElement('span', { className: styles.motionStage, 'aria-hidden': true },
    animated
      ? React.createElement('span', { className: styles.minkeSprite, style: { backgroundImage: `url(${MINKE_SWIM_SPRITE})` } })
      : React.createElement('span', { className: styles.motionFallback, style: speciesArtStyle(species) }),
  ),
  React.createElement('span', { className: styles.motionCopy },
    React.createElement('small', null, '当前同行鲸灵'),
    React.createElement('strong', null, species.nameZh),
    React.createElement('span', null, species.nameEn),
    React.createElement('p', null, animated ? '躯干、胸鳍与尾部形成连续游动；海水背景保持静止。' : species.story),
  ))
}
