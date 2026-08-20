// spotlight - section titles
// SPDX-License-Identifier: GPL-3.0-or-later
const SECTION_TITLES = {
    app: 'Applications',
    file: 'Files',
    calculator: 'Calculator',
    'system-action': 'System Actions',
    settings: 'Settings',
    web: 'Web Search',
};
export function getSectionTitle(type) {
    return SECTION_TITLES[type] || 'Results';
}
