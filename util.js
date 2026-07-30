// utility functions for spotlight
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
    // if reconstructed tokens don't match the original input there were unrecognized characters
    if (tokens.join('') !== input.replace(/\s+/g, '') || tokens.length === 0)
        return null;
    let pos = 0;
    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];
    // handles addition and subtraction which have the lowest precedence
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
    // handles multiplication division and modulo which have higher precedence
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
            }
            else {
                if (right === 0)
                    return null;
                value = value % right;
            }
        }
        return value;
    }
    // handles numbers unary plus/minus and parenthesized sub-expressions
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
    }
    catch (e) {
        return null;
    }
}
export function formatNumber(n) {
    return String(n);
}
// fuzzy matching with scoring
// splits the query into characters and checks if they appear in order in the target string
// returns a score where lower is better - returns -1 if no match
// a match at the start of the string scores better than a match in the middle
// consecutive character matches score better than scattered matches
export function fuzzyScore(query, target) {
    if (!query || !target)
        return -1;
    query = query.toLowerCase();
    target = target.toLowerCase();
    // exact substring match gets the best score
    if (target.includes(query))
        return 0;
    let score = 0;
    let qi = 0;
    let lastMatch = -2;
    for (let ti = 0; ti < target.length && qi < query.length; ti++) {
        if (target[ti] === query[qi]) {
            // bonus for consecutive matches
            if (ti === lastMatch + 1)
                score -= 5;
            // bonus for matching at word boundaries
            if (ti === 0 || target[ti - 1] === ' ' || target[ti - 1] === '-' || target[ti - 1] === '_')
                score -= 3;
            lastMatch = ti;
            qi++;
        }
        else {
            // penalty for each non-matching character
            score += 1;
        }
    }
    // if we didn't match all query characters it's not a match
    if (qi < query.length)
        return -1;
    return score;
}
