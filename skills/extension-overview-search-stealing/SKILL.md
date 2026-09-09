# Overview Search Stealing

Spotlight permanently takes over the GNOME Overview search infrastructure on enable. This is not a temporary reparenting on open and close. The widgets stay stolen for the entire lifetime of the extension.

## The Pattern

The `OverviewSearchStealer` class in `lib/overview/searchStealer.js` encapsulates all stealing and restoration logic. Thumbnail modifications live separately in `ThumbnailEnhancer` at `lib/overview/thumbnails.js`.

On enable, `steal()` does the following once:

1. Takes `Main.overview.searchEntry` and its parent reference
2. Takes `Main.overview._overview._controls._searchController` and its parent reference
3. Hides the entry with `visible = false` and a style class
4. Backs up and overrides `Main.overview.toggle` so toggling the overview while Spotlight is open focuses the search instead
5. Backs up and overrides `_searchResults.activateDefault` and `activate` to close the popup before running the original activation
6. Backs up and overrides `_search._searchCancelled` to be a no-op, preventing the controller from cancelling itself when its entry gets hidden
7. Connects a stage-level captured-event handler to intercept printable keys when the overview is visible, preventing the overview's type-to-search feature from activating
8. Increases workspace thumbnail scale to 200% by modifying `_thumbnailsBox._maxThumbnailScale` and overriding `SecondaryMonitorDisplay.prototype._getThumbnailsHeight`

On popup open, the already-stolen widgets are simply reparented into the popup container.

On popup close, they are removed from the popup but kept stolen and hidden. They are NOT returned to the overview.

Only on disable, returnOverviewSearch restores everything to its original state.

## Why This Works

The search controller continues running in the background regardless of where its widgets live. All GNOME search providers keep feeding it results. When Spotlight reparents the widgets into its popup, those already-active results render inside the popup instead of the overview. There is zero custom search provider code.

## Key Rules

- Never return widgets on popup close, only on extension disable
- Always back up original methods before overriding them
- The entry must be hidden when stolen, otherwise it would show in the overview in a broken state
- The search controller must not be allowed to cancel itself, which it would normally do when its entry gets hidden
- The overview toggle override ensures pressing Super while Spotlight is open does not dismiss Spotlight

## Black Screen Defense

When the popup is open in the overview and the user types, the ControlsManager reacts to the search controller notify::search-active by calling _onSearchChanged(). This method calls _searchController.show() and _updateThumbnailsBox(true), then eases three actors to opacity 0 (_appDisplay, _workspacesDisplay) while easing _searchController to opacity 255. Since the search controller widgets were permanently stolen, fading it in renders as empty black space. The _updateThumbnailsBox(true) call also hides the workspace thumbnails via its own ease call.

The fix overrides ControlsManager._onSearchChanged() on the instance. The override first calls the original bound method (so everything needed for results to render runs normally), then immediately counteracts the visual side effects. It applies zero-duration ease animations with IMMEDIATE mode on _appDisplay, _workspacesDisplay, _searchController, and _thumbnailsBox to override the fade transitions and restore the correct visual state.

Root cause verified in actual GNOME Shell source code: js/ui/overviewControls.js _onSearchChanged() and _updateThumbnailsBox() methods.

## Black Screen Defense

KNOWN ISSUE: When Spotlight opens in the overview/app grid and the user types, the ControlsManager reacts to the search controller notify::search-active by calling _onSearchChanged(). This method eases _appDisplay and _workspacesDisplay to opacity 0, calls _updateThumbnailsBox(true) which hides thumbnails, and eases _searchController to opacity 255. Since the search controller widgets were permanently stolen, fading it in renders as empty black space behind the Spotlight popup. The overview wallpaper and workspace thumbnails disappear.

CRITICAL FINDING: _searchController.show() is essential. The controller gets hidden via this._search.hide() in stealOverviewSearch(). When the popup opens, the controller is reparented but never explicitly shown. Normally ControlsManager._onSearchChanged() calls _searchController.show() which makes the controller and its children visible. Blocking _onSearchChanged() without calling show() leaves results invisible.

FAILED APPROACHES:
1. Override _onSearchChanged() to return early when popup visible — skipped _searchController.show() which broke result rendering entirely.
2. Override ease() on individual actors — too broad, blocked normal workspace thumbnail animations; also _updateThumbnailsBox() uses its own ease on _thumbnailsBox which was not covered.
3. Run original _onSearchChanged() then immediately counteract with zero-duration ease animations — the zero-duration animations did not properly override/replace the ongoing 250ms fade transitions; black screen remained.

APPROACHES UNDER TEST:
B. Override _onSearchChanged(), call only _searchController.show() when popup visible and searchActive true. Run cleanup calls when searchActive false. Skip all ease animations and _updateThumbnailsBox.
A. Run original _onSearchChanged() fully, then call remove_transition('opacity') on each affected actor followed by direct property assignment. Also handle scale-x, scale-y, translation-y on _thumbnailsBox. Clutter.Actor.remove_transition(name) API verified via official Mutter docs.

Root cause verified in actual GNOME Shell source code: js/ui/overviewControls.js.

