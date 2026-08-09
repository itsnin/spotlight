// spotlight - gnome shell version detection
// SPDX-License-Identifier: GPL-3.0-or-later

import * as Config from 'resource:///org/gnome/shell/misc/config.js';

// parse the running gnome shell version once at module load
// config.package_version is a string like "45.1", "46.0", "47.beta", "50"
// we only care about the major number since shell-version in metadata.json
// lists major versions only (45, 46, 47, 48, 49, 50)
// see https://gjs.guide/extensions/development/anatomy.html#metadata-json
const [major] = Config.PACKAGE_VERSION.split('.');
export const SHELL_VERSION = Number.parseInt(major, 10);

// convenience booleans so callers can write readable feature checks
// instead of comparing magic numbers scattered through the codebase
export const IS_GNOME_45 = SHELL_VERSION === 45;
export const IS_GNOME_46 = SHELL_VERSION === 46;
export const IS_GNOME_47 = SHELL_VERSION === 47;
export const IS_GNOME_48 = SHELL_VERSION === 48;
export const IS_GNOME_49 = SHELL_VERSION === 49;
export const IS_GNOME_50 = SHELL_VERSION === 50;

// true on gnome 48 and later where the vertical property on st widgets
// is deprecated in favor of orientation using clutter orientation values
// see https://gjs.guide/extensions/upgrading/gnome-shell-48.html#st-widgets-orientation
export const HAS_ORIENTATION_PROPERTY = SHELL_VERSION >= 48;
