// spotlight - about preferences page
// SPDX-License-Identifier: GPL-3.0-or-later

import Adw from 'gi://Adw';

export function buildAboutPage() {
    const group = new Adw.PreferencesGroup({title: 'About'});
    group.add(new Adw.ActionRow({
        title: 'Spotlight',
        subtitle: 'A compact macOS Spotlight inspired launcher for GNOME Shell.',
    }));
    return group;
}
