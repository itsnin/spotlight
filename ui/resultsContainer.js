// spotlight - results container widget
// SPDX-License-Identifier: GPL-3.0-or-later

import St from 'gi://St';

// creates the scrollable results container
export function buildResultsContainer() {
    const resultsScroll = new St.ScrollView({
        style_class: 'spotlight-results',
        hscrollbar_policy: St.PolicyType.NEVER,
        vscrollbar_policy: St.PolicyType.AUTOMATIC,
        visible: false,
    });
    const resultsBox = new St.BoxLayout({vertical: true, x_expand: true});
    resultsScroll.add_child(resultsBox);
    return {resultsScroll, resultsBox};
}
