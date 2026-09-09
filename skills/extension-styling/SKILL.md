# extension-styling

## File Location

stylesheet.css at the extension root gets auto-loaded by GNOME Shell.

## Comments

Only block comments are allowed. Never use line comments.

## Supported Properties

St supports a subset of CSS including color, background, border, border-radius, padding, margin and font.

## Unsupported

Box model layout properties like width, height and min-width must be set through JavaScript using set_width and set_height.

## Style Classes

Add style classes through widget.add_style_class_name. Never use inline style strings.

## Themes

Dark and light detection happens through org.gnome.desktop.interface color-scheme.

## Transparency

Use rgba colors for the background to achieve a glass effect. True background blur requires complex shaders or the GNOME 51 ext-background-effect-v1 protocol. An alpha value between 0.80 and 0.90 balances the glass feel with readability.

## St Icon Style

The -st-icon-style values, verified through official GNOME St documentation, are requested to use the icon natural style as the default behavior, regular to force full color even for symbolic names and symbolic to force symbolic even for regular names. Never force symbolic globally because it breaks GNOME core app icons.

## In Spotlight

All styling lives in `stylesheet.css`. Only `/* */` comments are used, never `//`. The popup widget at `lib/popup/widget/spotlightPopup.js` uses a translucent glass design: dark `rgba(28, 28, 30, 0.85)`, light `rgba(255, 255, 255, 0.88)`. The container is 520px wide with 36px rounded corners. Icons use `-st-icon-style: requested` so each icon keeps its natural style instead of being forced symbolic. The `theme-light` style class toggles the light color scheme on the content container.
