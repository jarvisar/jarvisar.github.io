# Backrooms portfolio imagery

Updated from the current local `threejs-maze` source on September 25, 2026. The gallery contains real Chromium screenshots, including the in-progress Level Fun. All captures use the flashlight, seed 42, Explore mode, 100% resolution, dynamic lights, default VHS effects, no head bob or power cuts, and hidden HUD. No simulator source files were changed.

Files in `assets/img/portfolio/`:

- `backrooms-cover.jpg`: 1200 × 675 cover, using the corridor capture and the existing main title. Subtitle removed.
- `backrooms-corridor.jpg`: camera (10, 10), yaw 3.6.
- `backrooms-open-rooms.jpg`: camera (4, 0), yaw 0.
- `backrooms-level-fun-room.jpg`: camera (0.7, 0.7), yaw 0.25.
- `backrooms-level-fun-cake.jpg`: camera (-0.8, -0.3), yaw 1.0.
- `backrooms-level-fun-corridor.jpg`: camera (6, 6), yaw 2.5.

Gallery screenshots are 1600 × 900. Camera coordinates are (x, z); pitch is 0 and yaw is in radians. Level Fun uses `?seed=42&mode=explore&level=fun&debug`. The standard level omits `level=fun`.

The cover was composited with the built-in imagegen tool, then exported as JPEG. The gallery files are direct browser captures. The cover is an edited derivative rather than a pixel-identical screenshot.

Initial cover prompt (inputs: corridor screenshot and previous cover as typography reference):

> Use case: compositing. Asset type: 16:9 portfolio cover. Image 1 is the edit target and new real gameplay screenshot with the flashlight ON. Image 2 is ONLY the reference for the existing title typography. Keep Image 1 as the background: same exact corridor geometry, perspective, wallpaper, carpet, ceiling, illumination including flashlight pool, grain and VHS look. Do not invent, redraw, move or add scene elements. Add the same two centered white text lines from Image 2, matching its pixel monospace lettering, size relative to canvas, spacing and placement. Text (verbatim): "BACKROOMS SIMULATOR" on the first line, "Infinitely Procedural" on the second line. Main title spans about 66% of width, centered at 47% of height; subtitle beneath at 55% of height. Keep all spelling and casing exactly as supplied. Only subtle dark text shadow for readability. No other words, no border, no logo, no new artwork. Output 16:9, 1600x900 or 1536x864. This is only replacement of the old background with the supplied new screenshot while preserving the title treatment.

Final edit prompt (input: first cover result):

> Use case: precise-object-edit. Edit this Backrooms Simulator portfolio cover. Remove the entire subtitle "Infinitely Procedural" below the main title, restoring the corridor wallpaper and distant light behind it. Keep the main title "BACKROOMS SIMULATOR" exactly unchanged: same letters, white pixel monospace font, size and current position. Keep the rest of the screenshot background exactly unchanged, including corridor geometry, flashlight illumination, wallpaper, carpet, ceiling and overall color. No other text. Do not move the main title. Output same 16:9 composition.

