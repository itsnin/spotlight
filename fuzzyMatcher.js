// spotlight - fuzzy string matcher
// SPDX-License-Identifier: GPL-3.0-or-later

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

    if (target.includes(query))
        return 0;

    let score = 0;
    let qi = 0;
    let lastMatch = -2;

    for (let ti = 0; ti < target.length && qi < query.length; ti++) {
        if (target[ti] === query[qi]) {
            if (ti === lastMatch + 1)
                score -= 5;
            if (ti === 0 || target[ti - 1] === ' ' || target[ti - 1] === '-' || target[ti - 1] === '_')
                score -= 3;
            lastMatch = ti;
            qi++;
        } else {
            score += 1;
        }
    }

    if (qi < query.length)
        return -1;

    return score;
}
