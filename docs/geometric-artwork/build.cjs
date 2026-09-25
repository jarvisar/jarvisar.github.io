// Reproduce the portfolio compositions using the project's actual SVG generators.
// node build.cjs <geometric repo> <temporary output directory>
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const [repo, out] = process.argv.slice(2);
if (!repo || !out) throw new Error('Expected geometric repository and output directory');
const src = path.join(repo, 'web/geometric-web-app/src');
const load = file => vm.runInThisContext(fs.readFileSync(path.join(src, file), 'utf8'), { filename: file });
['core', 'noise', 'contours', 'optimize', 'pipeline', 'export'].forEach(id => load(`lib/${id}.js`));
const designs = ['guilloche', 'flower', 'flowfield', 'truchet', 'ridgelines', 'spirograph'];
designs.forEach(id => load(`generators/${id}.js`));
const ink = '#233f48', rust = '#b7573d', paper = '#f7f3e9';
const pens = [ink, rust, '#657e6a'].map(color => ({ color, width: 0.27 }));
const settings = {
  seed: 23, paperW: 210, paperH: 210, margin: 12, scale: 100,
  rotate: 0, clip: 'rect',
  opt: { merge: true, mergeTol: 0.1, sort: true, simplify: true, simplifyTol: 0.02 }
};
const recipes = {
  guilloche: { pens: 2, lines: 9, waves: 36, bands: 3, lobesOut: 12, lobesIn: 12, quality: 2 },
  flower: { petals: 10, lines: 24, width: 0.27, organic: 0, twist: 12, centre: 0.07 },
  flowfield: { field: 'curl', spacing: 2, scale: 110 },
  truchet: {}, ridgelines: {}, spirograph: {}
};
const artwork = {};
for (const id of designs) {
  const def = PG.byId[id];
  const params = { ...PG.defaultParams(def), ...recipes[id] };
  const result = PG.run(def, params, settings);
  artwork[id] = PG.exporters.svg(result, { w: 210, h: 210 }, pens, { title: def.name }).replace(/<\?xml[^>]*>\s*/, '');
  console.log(`${id}: ${result.stats.paths} paths`);
}
const base = `*{box-sizing:border-box}body{margin:0;background:${paper};color:${ink};font-family:Arial,sans-serif}svg{display:block;width:100%;height:100%}.label{font:18px 'Courier New',monospace;letter-spacing:3px;text-transform:uppercase}.rule{height:1px;background:currentColor;opacity:.22}`;
function write(name, css, html) {
  fs.writeFileSync(path.join(out, name + '.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>${name}</title><style>${base}${css}</style><body>${html}</body></html>`);
}
fs.mkdirSync(out, { recursive: true });
write('cover', `body{width:1600px;height:900px;overflow:hidden}.copy{position:absolute;left:90px;top:90px;width:550px}.kicker{color:${rust}}h1{font-size:100px;line-height:.98;letter-spacing:-5px;font-weight:500;margin:115px 0 28px}h1 span{display:block}.art{position:absolute;left:650px;top:0;width:960px;height:900px}.art svg{width:960px;height:960px;position:absolute;top:-30px}.foot{position:absolute;left:90px;bottom:77px;width:485px}.foot .rule{margin-bottom:23px}.note{font-size:23px;letter-spacing:.3px}`,
  `<div class="copy"><div class="label kicker">Generative art / Pen plotting</div><h1><span>Geometric</span><span>Patterns</span></h1></div><div class="art">${artwork.guilloche}</div><div class="foot"><div class="rule"></div><div class="note">SVG generator &nbsp;·&nbsp; Adam Jarvis</div></div>`);
const captions = ['Guilloché', 'Flower', 'Flow field', 'Truchet', 'Ridgelines', 'Spirograph'];
write('collection', `body{width:1600px;height:1100px;padding:60px 70px;background:${ink};color:${paper}}header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:34px}h1{font-size:38px;font-weight:400;letter-spacing:-1px;margin:0}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}.card{background:${paper};color:${ink};height:422px;padding:12px 30px 22px}.drawing{height:352px}.caption{display:flex;justify-content:space-between;border-top:1px solid #d6d6cb;padding-top:14px;font-size:20px}.number{color:${rust};font-family:'Courier New',monospace}footer{margin-top:27px;font-size:17px;letter-spacing:1px;color:#cbd3ce}`,
  `<header><h1>One tool. Many ways to draw.</h1><div class="label">Selected patterns / 01—06</div></header><div class="grid">${designs.map((id,i)=>`<div class="card"><div class="drawing">${artwork[id]}</div><div class="caption"><span>${captions[i]}</span><span class="number">0${i+1}</span></div></div>`).join('')}</div><footer>Generated SVG artwork · Curves, fields and tiles</footer>`);
write('detail', `body{width:1600px;height:1100px;overflow:hidden}.intro{position:absolute;left:70px;top:66px;width:500px}h1{font-size:52px;line-height:1.08;font-weight:400;letter-spacing:-2px;margin:25px 0}p{font-size:23px;line-height:1.5;width:410px}.whole{position:absolute;left:35px;top:345px;width:575px;height:575px}.zoom{position:absolute;left:660px;top:0;width:940px;height:1100px;overflow:hidden;border-left:1px solid #d7d8cf;background:#f0eadd}.zoom svg{position:absolute;width:2100px;height:2100px;left:-510px;top:-220px}.key{position:absolute;left:70px;bottom:78px;display:flex;gap:35px;font-size:19px}.swatch{display:inline-block;width:30px;height:3px;margin:0 10px 5px 0;background:${ink}}.rust{background:${rust}}`,
  `<div class="intro"><div class="label">Guilloché / In detail</div><h1>Every line<br>has a path.</h1><p>Interwoven curves, separated into layers for two pens.</p></div><div class="whole">${artwork.guilloche}</div><div class="zoom">${artwork.guilloche}</div><div class="key"><span><i class="swatch"></i>Pen 01</span><span><i class="swatch rust"></i>Pen 02</span></div>`);
fs.writeFileSync(path.join(out, 'state.json'), JSON.stringify({
  v: 1, gen: 'guilloche', seed: settings.seed, params: { guilloche: { ...PG.defaultParams(PG.byId.guilloche), ...recipes.guilloche } },
  pens: pens.map((p,i) => ({ ...p, name: `Pen ${i+1}`, visible: true }))
}));
