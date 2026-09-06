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
