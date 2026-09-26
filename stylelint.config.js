/** @type {import('stylelint').Config} */
export default {
  extends: [
    'stylelint-config-standard',
    '@dreamsicle.io/stylelint-config-tailwindcss',
    '@double-great/stylelint-a11y/recommended',
  ],
  ignoreFiles: ['dist/**', 'node_modules/**', 'reference/**'],
  rules: {
    // Group design tokens with blank lines in :root.
    'custom-property-empty-line-before': null,
    // PhotoSwipe + site design tokens.
    'custom-property-pattern': null,
    // `:hover:not(:disabled)` before `:disabled` is intentional and readable.
    'no-descending-specificity': null,
    // BEM-ish public/admin classes; modifiers may include status enums (e.g. picks_submitted).
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(?:-+[a-z0-9]+)*(?:__(?:[a-z0-9_]+(?:-+[a-z0-9_]+)*)(?:--[a-z0-9_]+(?:-+[a-z0-9_]+)*)?|--[a-z0-9_]+(?:-+[a-z0-9_]+)*)?$',
      {
        message: (selector) => `Expected class selector "${selector}" to match BEM-like kebab-case`,
      },
    ],
    // Consolidated `@media (prefers-reduced-motion: reduce)` blocks in global.css;
    // this rule requires exact per-selector duplicates and fights that pattern.
    'a11y/media-prefers-reduced-motion': null,
  },
};
