import type * as React from 'react'
import { whaleCollectibleId, type WhaleCollectibleId } from '../catalog.ts'
import { WHALE_SPECIES, type WhaleSpeciesDefinition, type WhaleSpeciesId } from '../species.ts'
import { WHALE_SPECIES_ATLAS } from './species-atlas.ts'
import { WHALE_COLLECTIBLES_ATLAS } from './visual-assets.ts'

export function collectibleArtStyle(id: WhaleCollectibleId): React.CSSProperties {
  const index = whaleCollectibleId.indexOf(id)
  const column = index % 6
  const row = Math.floor(index / 6)
  return {
    backgroundImage: `url(${WHALE_COLLECTIBLES_ATLAS})`,
    backgroundPosition: `${column * 20}% ${row * (100 / 3)}%`,
  }
}

export function speciesArtStyle(species: WhaleSpeciesId | WhaleSpeciesDefinition): React.CSSProperties {
  const id = typeof species === 'string' ? species : species.id
  const index = WHALE_SPECIES.findIndex(candidate => candidate.id === id)
  const column = index % 5
  const row = Math.floor(index / 5)
  return {
    backgroundImage: `url(${WHALE_SPECIES_ATLAS})`,
    backgroundPosition: `${column * 25}% ${row * (100 / 3)}%`,
  }
}
