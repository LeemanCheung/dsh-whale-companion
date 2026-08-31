# ImageGen whale species atlas v2

The 20-species runtime atlas is a raster-only replacement for the generic inline-SVG companion.

- Generator: built-in `image_gen`.
- Source: `packages/dsh-whale-companion/assets/whale-species-atlas-imagegen-source.png`.
- Runtime: `packages/dsh-whale-companion/assets/whale-species-atlas.webp`.
- Layout: 5 columns × 4 rows; 192 × 160 pixels per runtime cell.
- Style: restrained deep-ocean digital gouache with species-specific anatomy and no text, logo, rings, detached effects, or visible grid lines.
- Runtime art contract: PNG/WebP only. The companion renderer and postcard export may not create SVG.

The exact source/output hashes, dimensions, and species order are locked by `whale-species-atlas-report.json` and `scripts/build-species-atlas.py --check`.

## Final built-in ImageGen prompt

> Create a production-ready raster species portrait atlas for the DSH whale companion. Restyle the provided 5×4 atlas while preserving its exact content contract and order. Keep exactly 20 equal cells in this order: common minke, Bryde's, humpback, gray, beluga; orca, sperm, long-finned pilot, narwhal, bowhead; fin, sei, blue, southern right, Omura's; Cuvier's beaked, North Atlantic right, North Pacific right, Rice's, spade-toothed beaked. Each cell contains one complete, unclipped, accurately identifiable whale facing screen-right at a consistent scale and baseline. Use refined digital-gouache natural-history illustration, tactile brush texture, anatomically credible but not photorealistic, restrained deep-ocean colors, and one shared quiet navy underwater background. Use exact 5×4 alignment with no visible grid lines. No text, labels, numbers, logos, watermark, UI, vector look, neon rings, cartoon eyes, smiles, duplicated whales, missing cells, or extra animals.
