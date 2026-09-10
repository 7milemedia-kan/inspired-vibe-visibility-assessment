# Visibility Engine Assessment

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
