// type declarations for gnome shell apis
// these are minimal stubs so typescript can compile without errors

declare module 'gi://St' {
  export default St;
  const St: any;
}

declare module 'gi://Shell' {
  export default Shell;
  const Shell: any;
}

declare module 'gi://Meta' {
  export default Meta;
  const Meta: any;
}

declare module 'gi://Clutter' {
  export default Clutter;
  const Clutter: any;
}

declare module 'gi://Gio' {
  export default Gio;
  const Gio: any;
}

declare module 'gi://GLib' {
  export default GLib;
  const GLib: any;
}

declare module 'gi://GObject' {
  export default GObject;
  const GObject: any;
}

declare module 'gi://Gtk' {
  export default Gtk;
  const Gtk: any;
}

declare module 'gi://Adw' {
  export default Adw;
  const Adw: any;
}

declare module 'gi://Gdk' {
  export default Gdk;
  const Gdk: any;
}

declare module 'resource:///org/gnome/shell/extensions/extension.js' {
  export class Extension {
    constructor(metadata?: any);
    enable(): void;
    disable(): void;
    getSettings(schema?: string): any;
    openPreferences(): void;
    readonly path: string;
    readonly uuid: string;
    readonly metadata: any;
  }
  export class ExtensionPreferences {
    constructor(metadata?: any);
    fillPreferencesWindow(window: any): void;
    getSettings(schema?: string): any;
    readonly path: string;
    readonly uuid: string;
    readonly metadata: any;
  }
  export function gettext(str: string): string;
}

declare module 'resource:///org/gnome/shell/ui/main.js' {
  export const layoutManager: any;
  export const wm: any;
  export const panel: any;
  export const overview: any;
  export const screenShield: any;
  export function pushModal(actor: any, params?: any): any;
  export function popModal(grab: any): void;
}

declare module 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js' {
  export class ExtensionPreferences {
    constructor(metadata?: any);
    fillPreferencesWindow(window: any): void;
    getSettings(schema?: string): any;
    readonly path: string;
    readonly uuid: string;
    readonly metadata: any;
  }
}

declare const global: any;
declare const imports: any;
