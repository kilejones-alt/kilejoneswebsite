# The Unlikely Zionists profile model

User-approved format, November 27, 2026. Use this model for future contributors.

- Use the contributor's correct first name in the heading: `[First name] is an unlikely Zionist.` Kile is spelled Kile.
- Store the approved introductory quotation in `introQuote` without outer quotation marks. The introduction sets `quotation: true`; `renderStoryText` creates a semantic blockquote with visible opening and closing curly double quotation marks. This is a reusable renderer, not punctuation hardcoded into Kile's content.
- Keep `Share your story` as text, without an arrow, icon, or generated decoration.
- Do not use up-right diagonal arrows anywhere on the site. Keep ordinary previous/next navigation functional.
- Every photograph quotation has visible opening and closing quotation marks. Use self-contained lines; do not restore the removed "If that’s wrong, what else is wrong?" quotation or the removed conversation photograph.
- The story deck advances every four seconds while visible, wraps to its first card, and stops for an open story, menu, keyboard focus, hidden tab, or visitor-selected pause. Respect reduced-motion preferences. Open reading chapters stay still for reading. The photograph presentation advances automatically with its own Pause/Play control.
- Photograph timing: six seconds for short quotations and eight seconds for quotations of eighteen words or more, including the current opening quote. Transition the complete photograph/quotation pair with a half-second crossfade after the next image is decoded. Keep photographs still between transitions, preserve Pause/Play and manual navigation, and omit the crossfade for reduced-motion preferences.
- Put related sentences in normal paragraphs. Do not split consecutive sentences into separate one-sentence paragraphs for dramatic effect. A deliberate isolated sentence may be used sparingly.
- Keep distinct memories in distinct sections. Retain enough original context that pronouns and quoted language cannot change the author's meaning.
- Do not leave criticized slogans as an unexplained closing declaration.
- Use antizionism and antizionist without hyphens in all visitor-facing text, including imported excerpts. Preserve functional source URLs.
- Keep navigation free of visible numbering. Preserve the site motion, readable body type, full photographs, and controls outside the scrolling reading area.
- Add only real contributor material with the necessary publication permissions. Do not invent people, quotes, motives, or experiences.

The current data model is `UZStoryContent` in `unlikely-zionists/story-content.js`. The existing three-part viewer supplies the introduction, background, and personal account. Its introductory name and quotation are generated from the profile data so the same format can be reused.
