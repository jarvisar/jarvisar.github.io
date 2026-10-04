# jarvisar.com

A simple list of my web apps and games that are deployed right now. Visit [jarvisar.com](https://jarvisar.com/) to see it.

Plain HTML and CSS with no build step. The look matches SVGmap and City Model, and it follows the system light or dark mode.

Enter **↑ ↑ ↓ ↓ ← → ← → B A**, or tap the top-left icon 2 times within four seconds, to unlock gravity. Drag and throw the pieces, try **Shake it up** or **Zero G**, and use **Restore** or **Escape** to return to the page. Project links still work with a click or tap. Entering the code again also restores the page.

`gravity.js` loads the locally vendored [Matter.js 0.20.0](https://github.com/liabru/matter-js/tree/0.20.0) only on activation. Its MIT license is in `vendor/MATTER-LICENSE.txt`; no CDN or build step is required. The animation pauses in background tabs and when the pieces settle, and uses gentler motion when reduced motion is requested.

On devices with orientation sensors, tilt the device to steer gravity in portrait or landscape. Allow motion and orientation access if the browser asks when unlocking the easter egg (requires HTTPS or localhost). Devices without sensor data, or with access denied, keep normal downward gravity. **Zero G** pauses tilt gravity until switched off, and **Restore** stops listening to the sensors.

## Adding a Project

1. Copy one of the `<li>` rows in `index.html` and update the link, name, description and host. Update the count in that section's heading too.
2. Save the project's `apple-touch-icon` to `icons/` at 80x80.
3. Add the URL to `sitemap.xml`.
