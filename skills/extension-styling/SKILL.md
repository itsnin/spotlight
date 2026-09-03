# extension-styling

## File Location
`stylesheet.css` at the extension root. Auto-loaded by GNOME Shell.

## Comments
Only block comments `/* */`. Never line comments `//`.

## Supported Properties
St supports a subset of CSS: color, background, border, border-radius, padding, margin, font.

## Unsupported
Box model layout. Width, height, min-width must be set via JavaScript (`set_width`, `set_height`).

## Style Classes
Add style class via `widget.add_style_class_name()`. Never inline style strings.

## Themes
Dark/light detection via `org.gnome.desktop.interface` `color-scheme`.

## Transparency
Use rgba colors for the background to achieve a glass effect: `rgba(r, g, b, a)`.
True background blur requires complex shaders or the GNOME 51 `ext-background-effect-v1` protocol.
Alpha 0.80 to 0.90 balances the glass feel with readability.

## St Icon Style
`-st-icon-style` values (verified via official GNOME St docs):
- `'requested'` — use the icon's natural style (default behavior)
- `'regular'` — force full-color even for symbolic names
- `'symbolic'` — force symbolic even for regular names

Never force symbolic globally. It breaks GNOME core app icons.
