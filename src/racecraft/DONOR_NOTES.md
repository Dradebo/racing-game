# Haram Ball donor strategy

## Primary donor shell

`FredericusRadicalus/retroFootballManager`

- MIT licensed.
- Browser-native, dependency-free football management game.
- Separates state, lineup, transfers, training, UI, and controller logic.
- Useful primitives: squad list, lineup selection, transfer market, training, news ticker, season progression, save/load JSON.

Haram Ball must reuse the interaction grammar and component boundaries while preserving `StrivingSnapshot` as canonical truth. Donor gameplay state is not authoritative.

## Secondary donor primitive

`yynakayama/soccer-tactics-board`

- MIT licensed.
- Browser-native draggable formation/substitution board.
- Useful for future Starting XI / formation interaction once the shell inheritance proves useful.

## Command-side donor

`gaemi/agentic-fc`

- MIT licensed.
- Useful reference for MCP/TUI operating surfaces, deterministic event logs, and spectator/operator separation.

## Rejected for direct code transplant

- `openfootmanager/openfootmanager`: GPLv3. Rich donor, but direct code incorporation would impose GPL obligations on the derivative.
- `EljoPleqi/the-system`: strong conceptual fit, but no explicit reuse license was located during the donor pass. Treat as inspiration only until licensing is confirmed.

## Rule

No new Haram Ball repository. Racecraft remains the host. The FM shell is a renderer over canonical race/project state, and all evidence/history continues to come from the existing Racecraft model.
