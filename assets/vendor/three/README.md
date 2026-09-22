# Three.js r140

The hero uses this local, unmodified ES module from the official Three.js
repository. It makes no runtime requests to a third-party JavaScript CDN.
Both homepage import maps point to this versioned file.

- Source: https://github.com/mrdoob/three.js/blob/r140/build/three.module.js
- Download: https://raw.githubusercontent.com/mrdoob/three.js/r140/build/three.module.js
- License: MIT; the upstream license is included in `LICENSE`.
- SHA-256: `14bbacdd257cd1de6f62718a34d7564e9a1b66380abfbdad13fbbf0314428e8a`

The upstream r140 tag has a render-target copy fix compared with the npm
0.140.0 build previously served by UNPKG. The hero does not use render targets.
This is a source-hosting change, not an upgrade to the latest Three.js release.

To update, download an explicitly tagged release from the official repository,
retain its license, use a new versioned filename, update both import maps and
this checksum, and check desktop/mobile rendering, reduced motion, offscreen
pausing, resizing, and WebGL fallback behavior. Updates are deliberate; this
vendored copy does not update automatically.
