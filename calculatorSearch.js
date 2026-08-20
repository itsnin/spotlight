// spotlight - calculator search provider
// SPDX-License-Identifier: GPL-3.0-or-later

import St from 'gi://St';
import {evaluateArithmetic, formatNumber} from './calculator.js';

// returns a calculator result if the input is valid arithmetic
export function searchCalculator(query) {
    const result = evaluateArithmetic(query);
    if (result === null)
        return null;

    return {
        type: 'calculator',
        title: formatNumber(result),
        description: 'Press Enter to copy to clipboard',
        icon: 'accessories-calculator-symbolic',
        activate: () => {
            // writes the result to the clipboard on user activation
            const clipboard = St.Clipboard.get_default();
            clipboard.set_text(St.ClipboardType.CLIPBOARD, formatNumber(result));
        },
    };
}
