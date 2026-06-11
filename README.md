# The Oasis — Interactive Property Explorer

A Next.js 14 (App Router) interactive building explorer. Hover a floor on the
facade, drill into a unit, view its detail card, and submit an enquiry — all
driven by image-percentage polygon coordinates.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000

> First run downloads the Cormorant Garamond + Manrope fonts via `next/font`
> (self-hosted at build), so keep an internet connection for the initial
> `npm install` / first compile.

## Project structure

```
app/
  layout.jsx        Root layout, loads fonts, imports global styles
  page.jsx          Renders <BuildingExplorer />
  globals.css       Tailwind layer + the explorer's glassmorphic theme
components/
  BuildingExplorer.jsx   The drill-down component (client component)
data/
  building.js       PROJECT info + FLOORS + UNITS (polygons & details)
public/
  oasis-elevation.jpg    The facade render the polygons map onto
```

## How the mapping works

Polygons are stored as **image-percentage** points (`x`, `y` from 0–100). The
SVG overlay uses `viewBox="0 0 100 100"` with `preserveAspectRatio="none"`, so
the same coordinates align at any size and aspect ratio — no math needed.

`data/building.js` is the single source of truth:

- `FLOORS[].points` — whole-floor polygons (from your floor mapper)
- `UNITS[id].points` — per-unit polygons
- `UNITS[id]` — `type`, `beds`, `baths`, `area`, `facing`, `price`, `status`

The current unit polygons are a **synthetic left/right split at the 60% mark**.
Replace them with your real picker output; nothing else needs to change.

## Swapping the assets

- **Image:** drop your full-resolution render in `public/` and pass it in:
  `<BuildingExplorer src="/your-render.jpg" />`, or point `src` at a
  CloudFront URL once assets are uploaded.
- **Data:** edit `data/building.js`. To load from DynamoDB instead, fetch in a
  Server Component and pass the data down as props.

## Colour semantics

- Teal `#00e5cc` — available units
- Red `#ff4d6a` — sold units (non-clickable)
- Gold `#d8b65a` — branding, price, floor highlight

## Notes

- The enquiry modal is front-end only. Wire `Submit Enquiry` to your
  SES / DynamoDB / API Gateway endpoint.
- The "Step inside · 360°" button is a placeholder for the next drill-down
  level (Photo Sphere Viewer panorama with yaw/pitch hotspots).

## Roadmap

1. ✅ Floor + unit mapping and drill-down UI
2. ⬜ Connect `data/building.js` to real DynamoDB unit data
3. ⬜ Floor-plan level (per-floor plan image with its own unit polygons)
4. ⬜ 360° interior walkthrough (Photo Sphere Viewer v5) with a click-to-place
   hotspot picker
