# extension-styling

## File location
stylesheet.css at extension root. Auto-loaded by GNOME Shell.

## Comments
Only block comments /* */. Never line comments //.

## Supported properties
St supports subset of CSS: color, background, border, border-radius, padding, margin, font.

## Unsupported
Box model layout. Width, height, min-width must be set via JavaScript (set_width, set_height).

## Style classes
Add style class via widget.add_style_class_name(). Never inline style strings.

## Themes
Dark/light detection via org.gnome.desktop.interface color-scheme.

## Transparency
Use rgba colors for background to achieve glass effect: rgba(r, g, b, a).
True background blur requires complex shaders or GNOME 51 ext-background-effect-v1 protocol.
Alpha 0.80 to 0.90 balances glass feel with readability.

## St icon style
-st-icon-style values (verified via official GNOME St docs):
- 'requested' — use icon's natural style (default behavior)
- 'regular' — force full-color even for symbolic names
- 'symbolic' — force symbolic even for regular names
Never force symbolic globally. It breaks GNOME core app icons.
