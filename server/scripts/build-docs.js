// Render the OpenAPI spec to static files you can open WITHOUT running the backend.
//
//   node scripts/build-docs.js      (or: npm run docs)
//
// Produces, next to this repo's server folder:
//   - openapi.json   : the raw spec (import into editor.swagger.io, Postman, etc.)
//   - api-docs.html  : a self-contained Swagger UI page — just double-click to open.
//
// The spec is embedded inline in the HTML, so the page works straight off the
// filesystem (file://) with no local server and no CORS issues. Swagger UI's JS/CSS
// load from a CDN, so you need internet the first time you open it.

const fs = require('node:fs');
const path = require('node:path');

const spec = require('../src/common/docs/openapi');

const outDir = path.resolve(__dirname, '..');
const jsonPath = path.join(outDir, 'openapi.json');
const htmlPath = path.join(outDir, 'api-docs.html');

fs.writeFileSync(jsonPath, JSON.stringify(spec, null, 2));

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${spec.info.title} — API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>body { margin: 0; } .topbar { display: none; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin></script>
  <script>
    /* eslint-disable */
    window.__SPEC__ = ${JSON.stringify(spec)};
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        spec: window.__SPEC__,
        dom_id: '#swagger-ui',
        deepLinking: true,
        docExpansion: 'none',
        persistAuthorization: true,
      });
    };
  </script>
</body>
</html>
`;

fs.writeFileSync(htmlPath, html);

console.log('API docs written:');
console.log('  - ' + jsonPath + '   (raw OpenAPI spec)');
console.log('  - ' + htmlPath + '  (double-click to open in a browser)');
