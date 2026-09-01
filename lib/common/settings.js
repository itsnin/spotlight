export const Settings = {
	Incognito: 'incognito',
	DisableGdaWarning: 'disable-gda-warning',
	DisableHljsDialog: 'disable-hljs-dialog',
	InMemoryDatabase: 'in-memory-database',
	DatabaseBackend: 'database-backend',
	DatabaseLocation: 'database-location',
	ClipboardHistory: 'clipboard-history',
	HistoryLength: 'history-length',
	HistoryTime: 'history-time',
	RememberSearch: 'remember-search',
	ExcludePinned: 'exclude-pinned',
	ExcludeTagged: 'exclude-tagged',
	ProtectPinned: 'protect-pinned',
	ProtectTagged: 'protect-tagged',
	PasteOnCopy: 'paste-on-copy',
	SyncPrimary: 'sync-primary',
	UpdateDateOnCopy: 'update-date-on-copy',
	ShowIndicator: 'show-indicator',
	ShowContentIndicator: 'show-content-indicator',
	WiggleIndicator: 'wiggle-indicator',
	SendNotification: 'send-notification',
	Sound: 'sound',
	Volume: 'volume',
	WmclassExclusions: 'wmclass-exclusions',
	ShowAtPointer: 'show-at-pointer',
	ShowAtCursor: 'show-at-cursor',
	ClipboardOrientation: 'clipboard-orientation',
	ClipboardPositionVertical: 'clipboard-position-vertical',
	ClipboardPositionHorizontal: 'clipboard-position-horizontal',
	ClipboardSize: 'clipboard-size',
	ClipboardMarginTop: 'clipboard-margin-top',
	ClipboardMarginRight: 'clipboard-margin-right',
	ClipboardMarginBottom: 'clipboard-margin-bottom',
	ClipboardMarginLeft: 'clipboard-margin-left',
	AutoHideSearch: 'auto-hide-search',
	ShowScrollbar: 'show-scrollbar',
	ItemWidth: 'item-width',
	ItemHeight: 'item-height',
	DynamicItemHeight: 'dynamic-item-height',
	TabWidth: 'tab-width',
	ShowHeader: 'show-header',
	HeaderControlsVisibility: 'header-controls-visibility',
	ShowItemTitle: 'show-item-title',
	TextItem: {
		ShowTextInfo: 'show-text-info',
		TextCountMode: 'text-count-mode',
	},
	CodeItem: {
		SyntaxHighlighting: 'syntax-highlighting',
		ShowLineNumbers: 'show-line-numbers',
		ShowCodeInfo: 'show-code-info',
		TextCountMode: 'text-count-mode',
	},
	ImageItem: {
		ShowImageInfo: 'show-image-info',
		BackgroundSize: 'background-size',
	},
	FileItem: {
		FilePreviewVisibility: 'file-preview-visibility',
		FilePreviewTypes: 'file-preview-types',
		FilePreviewExclusionPatterns: 'file-preview-exclusion-patterns',
		BackgroundSize: 'background-size',
		SyntaxHighlighting: 'syntax-highlighting',
		ShowLineNumbers: 'show-line-numbers',
	},
	LinkItem: {
		ShowLinkPreview: 'show-link-preview',
		ShowLinkPreviewImage: 'show-link-preview-image',
		LinkPreviewImageBackgroundSize: 'link-preview-image-background-size',
		LinkPreviewOrientation: 'link-preview-orientation',
		LinkPreviewExclusionPatterns: 'link-preview-exclusion-patterns',
	},
	CharacterItem: {
		MaxCharacters: 'max-characters',
		ShowUnicode: 'show-unicode',
	},
	Theme: {
		Theme: 'theme',
		ColorScheme: 'color-scheme',
		CustomColorScheme: 'custom-color-scheme',
		CustomBgColor: 'custom-bg-color',
		CustomFgColor: 'custom-fg-color',
		CustomCardBgColor: 'custom-card-bg-color',
		CustomSearchBgColor: 'custom-search-bg-color',
	},
	OpenClipboardDialogShortcut: 'open-clipboard-dialog-shortcut',
	ToggleIncognitoModeShortcut: 'toggle-incognito-mode-shortcut',
	OpenClipboardDialogBehavior: 'open-clipboard-dialog-behavior',
	PinItemShortcut: 'pin-item-shortcut',
	DeleteItemShortcut: 'delete-item-shortcut',
	EditItemShortcut: 'edit-item-shortcut',
	EditTitleShortcut: 'edit-title-shortcut',
	OpenMenuShortcut: 'open-menu-shortcut',
	MiddleClickAction: 'middle-click-action',
	SwapCopyShortcut: 'swap-copy-shortcut',
	SwapScrollShortcut: 'swap-scroll-shortcut',
};

export const ChildKeys = {
	TextItem: 'text-item',
	CodeItem: 'code-item',
	ImageItem: 'image-item',
	FileItem: 'file-item',
	LinkItem: 'link-item',
	CharacterItem: 'character-item',
	Theme: 'theme',
};

export const SettingsTypes = {
	[Settings.Incognito]: 'boolean',
	[Settings.DisableGdaWarning]: 'boolean',
	[Settings.DisableHljsDialog]: 'boolean',
	[Settings.InMemoryDatabase]: 'boolean', // deprecated
	[Settings.DatabaseBackend]: 'enum',
	[Settings.DatabaseLocation]: 'string',
	[Settings.ClipboardHistory]: 'enum',
	[Settings.HistoryLength]: 'int',
	[Settings.HistoryTime]: 'int',
	[Settings.RememberSearch]: 'boolean',
	[Settings.ExcludePinned]: 'boolean',
	[Settings.ExcludeTagged]: 'boolean',
	[Settings.ProtectPinned]: 'boolean',
	[Settings.ProtectTagged]: 'boolean',
	[Settings.PasteOnCopy]: 'boolean', // deprecated
	[Settings.SyncPrimary]: 'boolean',
	[Settings.UpdateDateOnCopy]: 'boolean',
	[Settings.ShowIndicator]: 'boolean',
	[Settings.ShowContentIndicator]: 'boolean',
	[Settings.WiggleIndicator]: 'boolean',
	[Settings.SendNotification]: 'boolean',
	[Settings.Sound]: 'string',
	[Settings.Volume]: 'double',
	[Settings.WmclassExclusions]: 'strv',
	[Settings.ShowAtPointer]: 'boolean',
	[Settings.ShowAtCursor]: 'boolean',
	[Settings.ClipboardOrientation]: 'enum',
	[Settings.ClipboardPositionVertical]: 'enum',
	[Settings.ClipboardPositionHorizontal]: 'enum',
	[Settings.ClipboardSize]: 'int',
	[Settings.ClipboardMarginTop]: 'int',
	[Settings.ClipboardMarginRight]: 'int',
	[Settings.ClipboardMarginBottom]: 'int',
	[Settings.ClipboardMarginLeft]: 'int',
	[Settings.AutoHideSearch]: 'boolean',
	[Settings.ShowScrollbar]: 'boolean',
	[Settings.ItemWidth]: 'int',
	[Settings.ItemHeight]: 'int',
	[Settings.DynamicItemHeight]: 'boolean',
	[Settings.TabWidth]: 'int',
	[Settings.ShowHeader]: 'boolean',
	[Settings.HeaderControlsVisibility]: 'enum',
	[Settings.ShowItemTitle]: 'boolean',
	[Settings.OpenClipboardDialogShortcut]: 'strv',
	[Settings.ToggleIncognitoModeShortcut]: 'strv',
	[Settings.OpenClipboardDialogBehavior]: 'enum',
	[Settings.PinItemShortcut]: 'strv',
	[Settings.DeleteItemShortcut]: 'strv',
	[Settings.EditItemShortcut]: 'strv',
	[Settings.EditTitleShortcut]: 'strv',
	[Settings.OpenMenuShortcut]: 'strv',
	[Settings.MiddleClickAction]: 'enum',
	[Settings.SwapCopyShortcut]: 'boolean',
	[Settings.SwapScrollShortcut]: 'boolean',
	[ChildKeys.TextItem]: {
		[Settings.TextItem.ShowTextInfo]: 'boolean',
		[Settings.TextItem.TextCountMode]: 'enum',
	},
	[ChildKeys.CodeItem]: {
		[Settings.CodeItem.SyntaxHighlighting]: 'boolean',
		[Settings.CodeItem.ShowLineNumbers]: 'boolean',
		[Settings.CodeItem.ShowCodeInfo]: 'boolean',
		[Settings.CodeItem.TextCountMode]: 'enum',
	},
	[ChildKeys.ImageItem]: {
		[Settings.ImageItem.ShowImageInfo]: 'boolean',
		[Settings.ImageItem.BackgroundSize]: 'enum',
	},
	[ChildKeys.FileItem]: {
		[Settings.FileItem.FilePreviewVisibility]: 'enum',
		[Settings.FileItem.FilePreviewTypes]: 'flags',
		[Settings.FileItem.FilePreviewExclusionPatterns]: 'strv',
		[Settings.FileItem.BackgroundSize]: 'enum',
		[Settings.FileItem.SyntaxHighlighting]: 'boolean',
		[Settings.FileItem.ShowLineNumbers]: 'boolean',
	},
	[ChildKeys.LinkItem]: {
		[Settings.LinkItem.ShowLinkPreview]: 'boolean',
		[Settings.LinkItem.ShowLinkPreviewImage]: 'boolean',
		[Settings.LinkItem.LinkPreviewImageBackgroundSize]: 'enum',
		[Settings.LinkItem.LinkPreviewOrientation]: 'enum',
		[Settings.LinkItem.LinkPreviewExclusionPatterns]: 'strv',
	},
	[ChildKeys.CharacterItem]: {
		[Settings.CharacterItem.MaxCharacters]: 'int',
		[Settings.CharacterItem.ShowUnicode]: 'boolean',
	},
	[ChildKeys.Theme]: {
		[Settings.Theme.Theme]: 'enum',
		[Settings.Theme.ColorScheme]: 'enum',
		[Settings.Theme.CustomColorScheme]: 'enum',
		[Settings.Theme.CustomBgColor]: 'string',
		[Settings.Theme.CustomFgColor]: 'string',
		[Settings.Theme.CustomCardBgColor]: 'string',
		[Settings.Theme.CustomSearchBgColor]: 'string',
	},
};

export const DatabaseBackend = {
	Default: 0,
	Memory: 1,
	Sqlite: 2,
	Json: 3,
};

export const ClipboardHistory = {
	Clear: 0,
	KeepPinnedAndTagged: 1,
	KeepAll: 2,
};

export const Orientation = {
	Horizontal: 0,
	Vertical: 1,
};

export const Position = {
	Top: 0,
	Left: 0,
	Center: 1,
	Bottom: 2,
	Right: 2,
	Fill: 3,
};

export const HeaderControlsVisibility = {
	Visible: 0,
	VisibleOnHover: 1,
	Hidden: 2,
};

export const TextCountMode = {
	Characters: 0,
	Words: 1,
	Lines: 2,
};

export const BackgroundSize = {
	Cover: 0,
	Contain: 1,
};

export const FilePreviewVisibility = {
	FilePreviewOnly: 0,
	FileInfoOnly: 1,
	FilePreviewOrFileInfo: 2,
	FilePreviewAndFileInfo: 3,
	Hidden: 4,
};

export const FilePreviewType = {
	None: 0,
	Text: 1,
	Image: 2,
	Thumbnail: 4,
	All: 7,
};

export const Theme = {
	Default: 0,
	Yaru: 1,
	Custom: 2,
};

export const ColorScheme = {
	System: 0,
	Dark: 1,
	Light: 2,
	HighContrast: 3,
};

export const CustomColorScheme = {
	Dark: 0,
	Light: 1,
	HighContrast: 2,
};

export const OpenClipboardDialogBehavior = {
	Toggle: 0,
	OpenOrSelectNext: 1,
};

export const MiddleClickAction = {
	None: 0,
	Pin: 1,
	Delete: 2,
};

export function bind_enum(settings, key, object, property) {
	object.set_property(property, settings.get_enum(key));
	settings.connect(`changed::${key}`, () => object.set_property(property, settings.get_enum(key)));
	object.connect(`notify::${property}`, () => {
		const value = object[property];
		if (value != null) settings.set_enum(key, value);
	});
}

export function bind_flags(settings, key, object, property) {
	object.set_property(property, settings.get_flags(key));
	settings.connect(`changed::${key}`, () => object.set_property(property, settings.get_flags(key)));
	object.connect(`notify::${property}`, () => {
		const value = object[property];
		if (value != null) settings.set_flags(key, value);
	});
}

export function migrateSettings(settings) {
	// inverted paste-on-copy -> swap-copy-shortcut
	const pasteOnCopy = settings.get_user_value('paste-on-copy');
	if (pasteOnCopy !== null) settings.set_boolean('swap-copy-shortcut', !pasteOnCopy.get_boolean());
	settings.reset('paste-on-copy');
}
