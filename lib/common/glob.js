/**
 * Converts a glob pattern to a regular expression.
 * @param patterns The glob patterns.
 * @returns The regular expression.
 */
export function globToRegex(...patterns) {
	return patterns.flatMap(expandBraces).map(translate).join('|');
}

function expandBraces(pattern) {
	let result = '';
	let i = 0;
	const n = pattern.length;
	while (i < n) {
		const c = pattern[i];
		i++;
		if (c === '{') {
			let j = i;
			while (j < n && pattern[j] !== '}') {
				j++;
			}
			if (j < n) {
				const remainder = expandBraces(pattern.substring(j + 1));
				const res = result;
				return pattern
					.substring(i, j)
					.split(',')
					.flatMap((s) => remainder.map((r) => `${res}${s}${r}`));
			} else {
				result += pattern.substring(i);
				break;
			}
		} else {
			result += c;
		}
	}
	return [result];
}

function translate(pattern) {
	let result = '';
	let i = 0;
	const n = pattern.length;
	while (i < n) {
		const c = pattern[i++];
		if (c === '*') {
			let count = 1;
			while (i < n && pattern[i] === '*') {
				count++;
				i++;
			}

			// globstar **
			if (count === 2) {
				// ** followed by / matches only directories
				if (i < n && pattern[i] === '/') {
					i++;
					result += `(?:.*\\/)?`;
				} else {
					result += `.*`;
				}
			} else {
				result += `[^\\/]*`;
			}
		} else if (c === '?') {
			result += '[^\\/]';
		} else if (c === '[') {
			let j = i;
			if (j < n && pattern[j] === '!') j++;
			if (j < n && pattern[j] === ']') j++;
			while (j < n && pattern[j] !== ']') j++;
			if (j >= n) {
				result += '\\[';
			} else {
				let stuff = pattern.substring(i, j).replace('\\', '\\\\');
				i = j + 1;

				// [!...] or [^...]
				if (stuff[0] === '!') {
					stuff = '^' + stuff.substring(1);
				}
				result += '[' + stuff + ']';
			}
		} else {
			// Escape / - \ ^ $ * + ? . ( ) | [ ] { }
			result += c.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
		}
	}
	return `^${result}$`;
}
