# Brainstorm Canvas

This is a self-contained local web app for the infinite idea canvas.

## Open it

The simplest path is:

1. Open `/Users/margotdemarco/Documents/Brainstorm/index.html` in a browser.

If you want the most reliable local-storage behavior, serve the folder locally:

```bash
cd /Users/margotdemarco/Documents/Brainstorm
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

## How it works

- Drag on empty canvas to create a new note; click inside it to type.
- On mobile, tap `New Card` and drag a rectangle on empty canvas. Otherwise, a one-finger swipe on empty canvas pans; pinch with two fingers to zoom.
- On mobile, `Swatch` toggles a horizontal row of square color choices below the controls.
- Hold Space and drag to pan, or drag any card edge to move a card.
- Choose a `Swatch`, then tap a note to recolor it or empty canvas to recolor the background. When a note is actively being edited, choosing a swatch recolors it immediately.
- `Link` tool: draw from one stack to another to connect them and unify their color.
- `Label` tool: click a note to name its connected group.
- `Text` opens a floating toolbar for editing, type size, bold, italic, underline, alignment, and restoring defaults.
- Double-click a card to zoom in; use `Center` to frame the whole board.
- `Fullscreen` expands the canvas to the full display; press Escape or use `Exit full screen` to leave it.

The board persists in `localStorage`, so your notes should still be there next time you open it in the same browser profile.
