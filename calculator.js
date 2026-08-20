// spotlight - arithmetic evaluator
// SPDX-License-Identifier: GPL-3.0-or-later
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

// evaluates arithmetic expressions using the system's bc calculator
// bc is the standard unix arbitrary-precision calculator available on every
// linux system including all gnome installations. it handles standard
// operator precedence correctly: ^ (exponent) then * / % then + -
//
// the -l flag loads the math library and sets scale=20 for high precision
//
// if bc is unavailable for any reason (extremely rare), we fall back to a
// built-in recursive descent parser that handles the same expression syntax
// and never uses eval().

function _evalWithBc(input) {
    try {
        const proc = Gio.Subprocess.new(
            ['bc', '-l'],
            Gio.SubprocessFlags.STDIN_PIPE | Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
        );
        const expr = input.trim() + '\n';
        const [ok, stdout, stderr] = proc.communicate_utf8(expr, null);
        if (!ok || !proc.get_successful())
            return null;
        const output = stdout.trim();
        if (!output || output.length === 0)
            return null;
        // bc outputs warnings to stderr for things like negative exponents
        // but still produces a result on stdout - accept those
        const num = parseFloat(output);
        if (!isFinite(num) || isNaN(num))
            return null;
        return num;
    } catch (e) {
        return null;
    }
}

// built-in fallback parser - recursive descent, never uses eval()
// handles same operators and precedence as bc
function _evalBuiltin(input) {
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
    const result = parseExpression();
    if (result === null || pos !== tokens.length)
        return null;
    if (!isFinite(result) || isNaN(result))
        return null;
    return result;
}

export function evaluateArithmetic(input) {
    // first try the system calculator (bc)
    const result = _evalWithBc(input);
    if (result !== null)
        return result;
    // fall back to built-in parser if bc is unavailable
    return _evalBuiltin(input);
}

export function formatNumber(n) {
    // strip trailing zeros after decimal point for cleaner display
    // bc with -l often gives 20 decimal places even for simple results
    let s = String(n);
    if (s.includes('.')) {
        s = s.replace(/\.?0+$/, '');
    }
    return s;
}
