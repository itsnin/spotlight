// spotlight - result row widget
// SPDX-License-Identifier: GPL-3.0-or-later

import St from 'gi://St';
import Clutter from 'gi://Clutter';

// builds a single result row with icon title and click/hover handling
export function buildResultRow(result, resultIndex, onActivate, onHover) {
    const hbox = new St.BoxLayout({
        style_class: 'spotlight-result',
        vertical: false,
        reactive: true,
        can_focus: true,
        track_hover: true,
    });

    const iconParams = {
        fallback_icon_name: 'application-x-executable',
        style_class: 'spotlight-result-icon',
        icon_size: 32,
    };

    if (result.type === 'app' && result.app)
        iconParams.gicon = result.app.get_icon();
    else if (typeof result.icon === 'string')
        iconParams.icon_name = result.icon;
    else
        iconParams.gicon = result.icon;

    const icon = new St.Icon(iconParams);

    const text = new St.BoxLayout({
        style_class: 'spotlight-result-content',
        vertical: true,
        y_align: Clutter.ActorAlign.CENTER,
        x_expand: true,
    });
    text.add_child(new St.Label({
        style_class: 'spotlight-result-title',
        text: result.title,
    }));
    if (result.description) {
        text.add_child(new St.Label({
            style_class: 'spotlight-result-description',
            text: result.description,
        }));
    }

    hbox.add_child(icon);
    hbox.add_child(text);

    hbox._resultIndex = resultIndex;

    hbox.connectObject(
        'button-release-event', () => {
            onActivate(result);
            return Clutter.EVENT_STOP;
        },
        'enter-event', () => {
            onHover(resultIndex);
            return Clutter.EVENT_PROPAGATE;
        },
        hbox,
    );

    return hbox;
}
