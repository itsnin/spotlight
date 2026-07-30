// spotlight - arithmetic evaluator
// SPDX-License-Identifier: GPL-3.0-or-later

// recursive descent parser for arithmetic expressions
// returns null if input is not valid math so the caller knows to treat it as a search query
// never uses eval() - it tokenizes the input then parses with standard operator precedence
export function evaluateArithmetic(input) {
    if (!/\d/.test(input) || !/[+\-*/%]/.test(input))
        return null;

    const tokens = [];
    const tokenRegex = /\s*([0-9]+(?:\.[0-9]+)?|[+\-*/%()])/g;
    let match;
    while ((match = tokenRegex.exec(input)) !== null)
        tokens.push(match[1]);

    if (tokens.join('') !== input.replace(/\s+/g, '') || tokens.length === 0)
        return null;

    let pos = 0;
    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];

    function parseExpression() {
        let value = parseTerm();
        if (value === null)
            return null;
        while (peek() === '+' || peek() === '-') {
            const op = consume();
            const right = parseTerm();
            if (right === null)
                return null;
            value = op === '+' ? value + right : value - right;
        }
        return value;
    }

    function parseTerm() {
        let value = parseFactor();
        if (value === null)
            return null;
        while (peek() === '*' || peek() === '/' || peek() === '%') {
            const op = consume();
            const right = parseFactor();
            if (right === null)
                return null;
            if (op === '*')
                value = value * right;
            else if (op === '/') {
                if (right === 0)
                    return null;
                value = value / right;
            } else {
                if (right === 0)
                    return null;
                value = value % right;
            }
        }
        return value;
    }

    function parseFactor() {
        const tok = peek();
        if (tok === undefined)
            return null;
        if (tok === '-') {
            consume();
            const v = parseFactor();
            return v === null ? null : -v;
        }
        if (tok === '+') {
            consume();
            return parseFactor();
        }
        if (tok === '(') {
            consume();
            const v = parseExpression();
            if (v === null || peek() !== ')')
                return null;
            consume();
            return v;
        }
        if (/^[0-9.]+$/.test(tok)) {
            consume();
            return parseFloat(tok);
        }
        return null;
    }

    try {
        const result = parseExpression();
        if (result === null || pos !== tokens.length)
            return null;
        if (!isFinite(result) || isNaN(result))
            return null;
        return result;
    } catch (e) {
        return null;
    }
}

export function formatNumber(n) {
    return String(n);
}
