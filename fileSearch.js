// spotlight - file search via tracker (gnome's default file indexer)
// SPDX-License-Identifier: GPL-3.0-or-later
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

// searches the user's files using tracker, the same system that powers
// gnome overview file search. connects to the tracker miner fs d-bus
// endpoint and runs a sparql query matching file names.
//
// tsparql/tracker is imported dynamically at module load time because it
// may not be available on all systems (minimal installs, etc.). if it's
// missing we simply return no file results rather than crashing the whole
// extension. we try both the new tsparql namespace and the legacy tracker
// namespace for maximum compatibility.
//
// result activation uses gio.appinfo.launch_default_for_uri which is
// exactly what the gnome overview uses. on stock gnome this opens
// folders with nautilus and files with their default application.
// nautilus is part of core gnome - without it gnome would be broken, so
// we safely assume it exists and do not add fallback handling.

let _connection = null;
let _tsparql = null;
let _tsparqlLoading = false;

// start loading immediately at module import time
// by the time the user types their first keystroke it should be resolved
(function _loadTsparql() {
    if (_tsparql !== null || _tsparqlLoading)
        return;
    _tsparqlLoading = true;

    // try new namespace first, fall back to legacy namespace
    import('gi://Tsparql-3.0')
        .then((module) => {
            _tsparql = module.default;
        })
        .catch(() => {
            // tsparql not available - try legacy tracker namespace
            return import('gi://Tracker-3.0');
        })
        .then((module) => {
            if (!_tsparql && module)
                _tsparql = module.default;
        })
        .catch(() => {
            // neither namespace available - disable file search
            _tsparql = false;
        })
        .finally(() => {
            _tsparqlLoading = false;
        });
})();

function _getConnection() {
    if (_connection)
        return _connection;
    // tsparql still loading or unavailable - caller handles null gracefully
    if (!_tsparql)
        return null;
    try {
        _connection = _tsparql.SparqlConnection.bus_new(
            'org.freedesktop.Tracker3.Miner.Files',
            null, null,
        );
    } catch (e) {
        // tracker not available - return null and callers handle it gracefully
        _connection = null;
    }
    return _connection;
}

// builds a sparql query that matches files by name
// simple substring match on file name - works reliably across all
// tracker versions without requiring fts configuration
function _buildQuery(text, limit) {
    const escaped = text.replace(/'/g, "''");
    const lower = escaped.toLowerCase();
    return `
        SELECT ?url ?name WHERE {
            ?u a nfo:FileDataObject ;
               nfo:fileName ?name ;
               nie:url ?url .
            FILTER(CONTAINS(LCASE(?name), '${lower}'))
        }
        ORDER BY DESC(nfo:fileLastModified(?u))
        LIMIT ${limit}
    `;
}

// extract just the filename from a file:// uri for the description line
function _uriToPath(uri) {
    if (!uri.startsWith('file://'))
        return uri;
    const path = decodeURIComponent(uri.slice(7));
    return path;
}

// shorten a path for display - show home as ~ and truncate middle if too long
function _formatDescription(path) {
    const home = GLib.get_home_dir();
    let display = path;
    if (display.startsWith(home))
        display = '~' + display.slice(home.length);
    if (display.length > 60) {
        const head = display.slice(0, 28);
        const tail = display.slice(-28);
        display = head + '\u2026' + tail;
    }
    return display;
}

// icon for file results - we can't stat without blocking the main loop
// so we use a generic document icon. tracker doesn't expose folder vs
// regular file in a way we can query cheaply here, and guessing from
// the name (no extension = folder) is wrong for files like Makefile,
// Dockerfile, .bashrc etc. a generic icon is always correct even if
// less informative.
const FILE_ICON = 'text-x-generic';

export function searchFiles(text, maxResults) {
    const trimmed = text.trim();
    if (trimmed.length < 2)
        return [];
    const conn = _getConnection();
    if (!conn)
        return [];
    const results = [];
    let cursor = null;
    try {
        cursor = conn.query(_buildQuery(trimmed, maxResults), null);
        while (cursor.next(null)) {
            // get_string may return either a plain string or a [string, length] tuple
            // depending on gjs version and introspection annotations - handle both
            const urlVal = cursor.get_string(0);
            const nameVal = cursor.get_string(1);
            const url = Array.isArray(urlVal) ? urlVal[0] : urlVal;
            const name = Array.isArray(nameVal) ? nameVal[0] : nameVal;
            if (!url || !name)
                continue;
            // skip the search entry itself if it somehow matches
            if (name.toLowerCase() === trimmed.toLowerCase() && results.length > 0)
                continue;
            const path = _uriToPath(url);
            results.push({
                type: 'file',
                title: name,
                description: _formatDescription(path),
                icon: FILE_ICON,
                activate: () => {
                    try {
                        Gio.AppInfo.launch_default_for_uri(url, null);
                    } catch (e) {
                        // failed to launch - silently ignore
                    }
                },
            });
        }
    } catch (e) {
        // query failed - tracker might be busy or unavailable
        // return whatever we collected so far, or empty
    } finally {
        if (cursor)
            cursor.close();
    }
    return results;
}
