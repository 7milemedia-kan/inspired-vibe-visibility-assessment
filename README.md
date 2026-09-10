# Visibility Engine Assessment

## Deploy the branded assessment to Vercel

Use the repository root as Vercel's Root Directory. The root `vercel.json` installs the locked dependencies in `visibility-engine-assessment`, builds the branded React survey, and publishes `visibility-engine-assessment/dist-vercel`.

The framework preset is Other. Build and output settings are supplied by `vercel.json`. Redeploy the latest Git commit after changing these settings.

To reproduce the Vercel build locally:

```bash
npm ci --prefix visibility-engine-assessment
npm run build
npm --prefix visibility-engine-assessment run preview:vercel
```

The deployment is static: answers and scoring remain in the browser. Balboa fonts are included locally; Montserrat loads from Google Fonts. No server environment variables are required.

The files at the repository root below describe the earlier static survey. Build that earlier version with `npm run build:legacy`.

A responsive, keyboard-friendly 24-question assessment that scores all six Visibility Engine dimensions and can run as a standalone page or be embedded in another website.

## Customize the questions

Edit the `sections` array at the top of `src/main.js`. Every A–E response is scored 0–4. Each four-question dimension and the overall result are normalized to 100; the strongest and weakest dimensions are identified automatically.

## Run locally

```bash
npm run dev
```

## Embed on any website

Host this project at your preferred URL, then use either option below.

### Script embed

```html
<script
  src="https://YOUR-DOMAIN.com/embed.js"
  data-height="720px"
  data-title="Visibility Engine Assessment"
></script>
```

### Direct iframe

```html
<iframe
  src="https://YOUR-DOMAIN.com/?embed=1"
  title="Visibility Engine Assessment"
  style="width:100%;height:720px;border:0;border-radius:16px"
></iframe>
```

The `?embed=1` parameter removes the standalone introduction panel so the questionnaire fits naturally inside an existing page.
