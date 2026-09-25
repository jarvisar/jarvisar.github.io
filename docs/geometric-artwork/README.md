# Geometric portfolio artwork

The cover, six-design collection, and linework detail use SVG paths produced by
the actual generators in `jarvisar/geometric`. These are digital presentations of
the output, not photographs of physical plots. The app image is a browser capture
of the local project, using the same guilloché parameters and pen colors.

The palette pairs blue-black and terracotta ink with warm cream paper. The cover
is a 1200 × 675 JPEG; the gallery images are 1600 × 1100 WebP files. Recipes, seed,
colors, and composition layouts are recorded in `build.cjs`.

To rebuild from the portfolio repository (requires Node.js, Python with Pillow
and Playwright, and installed Chrome):

```powershell
python docs/geometric-artwork/render.py C:/Users/adamj/source/repos/geometric
```

The script reads the generator repository without changing it, stages HTML/SVG
in a temporary directory, and writes the four final images to
`assets/img/portfolio/geometric-*`. It does not introduce a site build dependency.
