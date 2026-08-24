// spotlight - about preferences page
// SPDX-License-Identifier: GPL-3.0-or-later
import Adw from 'gi://Adw';

export function buildAboutPage() {
    const group = new Adw.PreferencesGroup({title: 'About'});
    group.add(new Adw.ActionRow({
        title: 'Spotlight',
        subtitle: 'A compact Spotlight inspired launcher for GNOME Shell.',
    }));
    group.add(new Adw.ActionRow({
        title: 'Version',
        subtitle: '2026.08.25',
    }));
    group.add(new Adw.ActionRow({
        title: 'License',
        subtitle: 'GPL-3.0-or-later',
    }));
    return group;
}
