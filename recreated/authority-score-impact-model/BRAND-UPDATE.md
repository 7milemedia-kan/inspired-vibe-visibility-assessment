# Inspired Vibe visual update — September 9, 2026

Applied the current brand styles from https://inspiredvibe.com/ to the restored application.

- Balboa headings and display numbers, with Montserrat body copy, controls, and labels.
- Warm off-white #F4EEED, white #FFFFFF, navy #022D41 / #002E41, red #BF2D32, turquoise #1AA6B7, warm gray #BFBAB5, and charcoal #333333.
- Light theme by default, red primary actions, navy emphasis, and turquoise accents.
- Existing status text colors were darkened for light-card readability.
- Balboa webfonts copied from the supplied website to client/public/fonts; Montserrat continues to load from Google Fonts.

The existing screens, inputs, assessment rules, revenue formulas, and backend integrations are preserved. This styling update supersedes RESTORATION.md's description of the initial byte-for-byte screen restoration.

Source: the website's linked fusion-styles/023b797c8ab3af20d8eae09d27b16d86.min.css stylesheet, including its global palette, typography tokens, and font-face declarations.

Validation: production build passed; local homepage, compiled assets, and both Balboa font files returned HTTP 200. No browser screenshot comparison was performed.
