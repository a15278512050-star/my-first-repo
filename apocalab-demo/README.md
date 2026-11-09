# ApocaLab — Educational Demo

A static English-language, no-paid-API interactive geographic education demonstration.

## Local run

Serve files over HTTP (example: `python -m http.server 8000`) rather than file://. The interactive Leaflet map requires external access to the Leaflet CDN and OSM demo tile service. Other pages render without JavaScript.

## User experience

1. Search an offline-indexed city to move the map camera.
2. Click any map location to set the point; three circles are **distance rulers**, not effects calculations.
3. Play the 28-second artistic cloud. The anchor is frozen; clicks during playback do nothing. Pan and zoom scale the presentation relative to the geographic anchor.
4. After completion, cloud remains. Click a new point to reset; share URLs contain `lat`, `lng`, `z`.

## Limitations

This is not a nuclear-weapons impact calculator. It does not return blast/heat/fallout distances, human harm figures, or population projections. No WorldPop raster has been integrated. City-specific impact pages and arbitrary-coordinate OG images are not implemented. The default social OG card is SVG, and social platform support varies. Public OSM tile hosting is used for a **small evaluation only**, not as the production CDN. Production map hosting, content review, and operator privacy/legal review remain outstanding.
