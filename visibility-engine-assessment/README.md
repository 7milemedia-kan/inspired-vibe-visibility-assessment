# Visibility Engine Assessment

A local, interactive 24-question assessment covering six visibility dimensions. Answers are saved in the browser on the current device, and all scoring happens locally.

## Open the survey

1. Open PowerShell in this folder.
2. Run `npm run dev`.
3. Open the local address shown in the terminal (normally `http://localhost:3000`).

## Create a production build

Run `npm run build`. The build output is written to `dist`.

## Scoring

Each answer scores from 0 to 4. Each dimension contains four questions and is normalized to 100. The overall result is the total score divided by 96, normalized to 100 and rounded to the nearest whole number.

- 0–39: Expertise Trapped
- 40–59: Visible but Fragmented
- 60–79: Emerging Visibility Engine
- 80–100: Compounding Market Authority
