// spotlight - file search via tracker (gnome's default file indexer)
// SPDX-License-Identifier: GPL-3.0-or-later
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Tsparql from 'gi://Tsparql-3.0';
// searches the user's files using tracker, the same system that powers
// gnome overview file search. connects to the tracker miner fs d-bus
// endpoint and runs a sparql query matching file names.
//
// result activation uses gio.appinfo.launch_default_for_uri which is
// exactly what the gnome overview uses. on stock gnome this opens
// folders with nautilus and files with their default application.
// nautilus is part of core gnome - without it gnome would be broken, so
// we safely assume it exists and do not add fallback handling.
let _connection = null;
function _getConnection() {
    if (_connection)
        return _connection;
    try {
        _connection = Tsparql.SparqlConnection.bus_new(
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
// uses fts:match for full-text search when available, falls back to
// contains() for simple substring matching on the file name
function _buildQuery(text, limit) {
    const escaped = text.replace(/'/g, "''");
    const lower = escaped.toLowerCase();
    // simple substring match on file name - works reliably across all
    // tracker versions without requiring fts configuration
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
// choose an appropriate icon based on whether the uri points to a folder
// or a file - we can't stat here without blocking, so we guess from the
// path: trailing slash or no extension suggests folder, otherwise generic file
function _guessIcon(uri, name) {
    // check if it looks like a folder: no dot in the last path component
    const parts = uri.split('/');
    const last = parts[parts.length - 1] || parts[parts.length - 2];
    if (!last.includes('.'))
        return 'folder';
    return 'text-x-generic';
}
export function searchFiles(text, maxResults) {
    const trimmed = text.trim();
    if (trimmed.length < 2)
        return [];
    const conn = _getConnection();
    if (!conn)
        return [];
    const results = [];
    try {
        const cursor = conn.query(_buildQuery(trimmed, maxResults), null);
        while (cursor.next(null)) {
            const url = cursor.get_string(0)[0];
            const name = cursor.get_string(1)[0];
            if (!url || !name)
                continue;
            // skip the search entry itself if it somehow matches
            if (name.toLowerCase() === trimmed.toLowerCase() && results.length > 0)
                continue;
            const path = _uriToPath(url);
            const iconName = _guessIcon(url, name);
            results.push({
                type: 'file',
                title: name,
                description: _formatDescription(path),
                icon: iconName,
                activate: () => {
                    try {
                        Gio.AppInfo.launch_default_for_uri(url, null);
                    } catch (e) {
                        // failed to launch - silently ignore
                    }
                },
            });
        }
        cursor.close();
    } catch (e) {
        // query failed - tracker might be busy or unavailable
        // return whatever we collected so far, or empty
    }
    return results;
}
