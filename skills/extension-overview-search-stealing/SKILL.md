# Overview Search Stealing

Spotlight permanently takes over the GNOME Overview search infrastructure on enable. This is not a temporary reparenting on open and close. The widgets stay stolen for the entire lifetime of the extension.

## The Pattern

On enable, stealOverviewSearch does the following once:

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

The overview type-to-search handler connects to stage captured-event at shell startup, before any extension loads. Due to capture handler firing order, an extension handler can never prevent the overview handler from running first. The overview handler detects printable keys and activates the search controller, which triggers the ControlsManager to switch to search view. Since Spotlight permanently stole the search widgets, this view renders as empty black space.

Defense in depth is required:

1. **Proactive container hiding.** When stealing the entry and search controller, also hide their original parent containers. Even if the overview tries to show the search view, there is nothing visible to render.

2. **Reactive notify::search-active.** Connect to the search controller's notify::search-active signal. When it becomes true while the popup is visible, immediately re-hide the parent containers. This counteracts the ControlsManager's view switch even though it fires after the fact.

3. **Stage key capture.** Still useful for when the popup is NOT visible. Consumes printable keys so typing in the overview does nothing. When the popup IS visible, forwards keys to the entry manually since focus routing alone is not sufficient defense.

## Black Screen Defense

When the popup is open and the user types, the entry receives key events through focus routing or manual forwarding. The search controller activates and its notify::search-active signal fires. The ControlsManager reacts by calling _onSearchChanged() which fades out the app display and workspaces display (opacity to 0) and fades in the search controller. Since the search controller widgets were permanently stolen, fading it in renders as empty black space.

The fix overrides ControlsManager._onSearchChanged() on the instance at Main.overview._overview._controls. The override checks if the popup is visible and returns early if so, skipping the fade animations entirely. When the popup is not visible, it delegates to the original bound method. Root cause verified in actual GNOME Shell source code: js/ui/overviewControls.js _onSearchChanged() method.

Stage key capture is still needed for when the popup is NOT visible — it consumes printable keys so typing in the overview does nothing. When the popup IS visible, it manually forwards keys to the entry via entry.event(event) because EVENT_STOP at capture phase prevents normal target-phase delivery.

