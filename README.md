# Bubble Trouble Refactor v3

This pass breaks the second-pass `updateGameState.js` monolith into smaller systems and extracts two remaining UI concerns from the main component.

## New structure

- `src/BubbleTrouble.third-pass.jsx` — slimmer orchestrator component
- `src/hooks/useKeyboard.js` — keyboard state wiring
- `src/ui/GameOverlayModals.jsx` — level-select and scores overlays
- `src/game/updateGameState.js` — orchestration only
- `src/game/systems/levelFlowSystem.js` — intro/death/timer/level-complete flow
- `src/game/systems/playerSystem.js` — player movement and push input
- `src/game/systems/bubbleSystem.js` — bubble helpers, collectibles, sliding bubbles, bubble animation ticks
- `src/game/systems/spawnSystem.js` — spawn queue and hatch capsule logic
- `src/game/systems/enemySystem.js` — enemy AI, Haarrfish trigger, trap-bubble updates

## Result

The biggest practical win is that the runtime logic is now divided by responsibility. The top-level updater is short, and the main React component no longer owns keyboard wiring or modal markup.

## Caveat

This is still a manual refactor pass. I preserved the overall behavior and moved logic into systems, but I did not add a test harness or do a full gameplay verification pass.
