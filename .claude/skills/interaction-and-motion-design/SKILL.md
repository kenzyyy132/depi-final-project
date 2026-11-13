---
name: interaction-and-motion-design
description: Interaction patterns, micro-interactions, and animation rules for the Scheduling System. Use when adding transitions, hover/press feedback, drag or keyboard interactions, toasts, dialogs, or any animated state change.
---

# Interaction & Motion Design — Scheduling System

## Principles
- Motion explains causality: something came from here, went there, or changed state. If it explains nothing, remove it.
- Fast by default: 120–200ms for UI feedback and ≤ 320ms for layout or entrance changes. Never block input while something animates.
- Use CSS transitions and `@keyframes` only, with no animation library. Animate `transform` and `opacity` only, not `width`, `height`, or `top`.
- Always respect `prefers-reduced-motion: reduce`. Replace movement with an instant change or an opacity fade.

## Catalogue
| Moment | Behavior |
|---|---|
| Button press | `scale(.98)` on `:active`, 120ms |
| Hover on rows/cards | background shift to `--surface-raised`, no lift/shadow jump |
| Dialog open | backdrop fade 200ms; panel `translateY(8px) scale(.98)` → none; bottom sheet slides up on mobile |
| Dialog close | reverse at 150ms; unmount after `transitionend` (or a timeout fallback) |
| Toast | enters from top-right (bottom on mobile), auto-dismiss 3.5s, pause on hover/focus, closable, stacked queue |
| Status change | the status pill crossfades, and a completed task's progress ring/bar animates to its new value |
| Route change | content fades in at 160ms. Don't slide whole pages |
| Calendar month change | grid slides 12px in the travel direction plus a fade |
| Conflict detected (TaskForm) | conflict panel expands in with a height-safe approach (grid-rows `0fr→1fr`), focus moves to it, and `aria-live` announces it |
| Copy join code | the icon morphs to a check for 1.5s and a toast confirms |
| Skeletons | only when data is genuinely async (auth hashing). LocalStorage reads are synchronous, so don't fake loading |

## Keyboard & power-user interactions
- `Esc` closes the topmost dialog or sheet. `Enter` submits forms.
- Global: `/` focuses search, `N` opens New task for managers, `G then D/P/T/C` navigates. Show hints with `<Kbd>`. Hotkeys are disabled while typing in inputs.
- Calendar: arrow keys move the focused day, `PageUp/PageDown` changes the month, `T` jumps to today.

## Feedback states every interactive element needs
default, hover, focus-visible, active, disabled, and loading (if async). Selected/checked if applicable.

## Don't
- Don't use parallax, confetti, or bouncy springs on data UIs.
- Don't loop animations other than a spinner.
- Don't let animation change layout (CLS).
