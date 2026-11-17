import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => readFile(path.join(root, file), 'utf8');
const [template, css, three, ...scripts] = await Promise.all([
  read('src/index.template.html'),
  read('src/styles.css'),
  read('vendor/three/three.min.js'),
  ...['controls', 'environment', 'vehicle', 'runtime'].map((name) => read(`src/${name}.js`)),
]);
const output = template
  .replace('/* APP_STYLES */', () => css)
  .replace('<!-- THREE_LIBRARY -->', () => `<script>\n${three}\n</script>`)
  .replace(
    '<!-- GAME_SCRIPT -->',
    () => `<script>\n(() => {\n'use strict';\n${scripts.join('\n')}\n})();\n</script>`,
  );
await mkdir(path.join(root, 'dist'), { recursive: true });
await writeFile(path.join(root, 'dist/index.html'), output);
console.log('Built dist/index.html — self-contained and offline ready.');
