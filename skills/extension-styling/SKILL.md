# extension-styling

## file location
stylesheet.css at extension root auto loaded by gnome shell

## comments
only block comments /* */ never line comments //

## supported properties
st supports subset of css color background border border-radius padding margin font

## unsupported
box model layout width height min width must be set via javascript set_width set_height

## style classes
add style class via widget.add_style_class_name never inline style strings

## themes
dark light detection via org.gnome.desktop.interface color-scheme

## transparency
use rgba colors for background to achieve glass effect rgba r g b a
true background blur requires complex shaders or gnome 51 ext background effect protocol
alpha 0.80 to 0.90 balances glass feel with readability