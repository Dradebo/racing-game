# Racecraft Renderer Map

Reality owns state. The fork supplies visual primitives. A primitive is only admitted when it makes canonical Racecraft state more legible.

## Canonical mapping

| Racecraft state | Renderer meaning | Fork material to reuse |
| --- | --- | --- |
| Season | Championship context and accumulated record | starting-grid composition, trophy/podium language, environment treatment |
| Race | One bounded striving object with a finish line | vehicle + route + race broadcast camera |
| Circuit | Rules and character of the current race surface | track geometry, terrain, ramps, route treatment |
| Lap | A bounded unit with a finish condition | route segment, lap marker, checkpoint gate |
| Split | Telemetry inside a lap | checkpoint timing / replay markers |
| RaceEvent | Historical state transition | checkpoint gate positioned by event progress |
| progress | Verified forward state transition | vehicle advances, clear road, normal camera |
| verification | State confirmed by evidence | bright checkpoint, tighter camera, clean vehicle treatment |
| blocker | Current movement obstructed | barrier/obstruction, brake lights, compressed camera |
| wait | Waiting on external dependency | pit-hold/off-line treatment, wide side camera |
| rest | Deliberate parked state | parked treatment, quiet scene, no urgency effects |
| relay | Baton/state handoff | handoff checkpoint; later multi-vehicle / pit exchange treatment |
| mutation | Circuit/race changed materially | route/circuit treatment visibly changes |
| finish | Finish verified | finish gate, elevated camera, podium/trophy creation |
| stale / no signal | Race no longer reporting meaningful state | subdued beacon, degraded track signal treatment |
| attention | Operator intervention required | yellow/red flag language; never generic notification styling |
| recovery | Blocker/interruption followed by verified movement | persistent skid/trace + recovery trophy candidate |

## Fork primitives and intended use

- `Track`: authored world substrate. Keep geometry; increasingly vary treatment by circuit and race state.
- `Chassis` GLTF: visual vehicle only. Racecraft owns position/orientation/state; do not restore player physics as canonical progress.
- `Checkpoint`: timing idea becomes event/split presentation, not player trigger authority.
- `Goal`: finish-condition trigger concept becomes evidence-backed finish semantics.
- `Cameras`: camera vocabulary becomes broadcast grammar controlled by race state/replay events.
- `Boost`: momentum/clean sequence visual only when event history justifies it. Never a streak counter.
- `Dust`: rough movement / uncertain conditions / difficult transitions when supported by state.
- `Skid`: persistent historical trace for difficult transitions and recoveries.
- `Ramp`: circuit challenge / mutation where the circuit data justifies a changed surface.
- `Train`: external blocker/dependency only when the event/dependency semantics support a moving external obstruction; never generic decoration.
- environmental audio, clouds, birds, water: atmosphere and circuit character; must not obscure race state.

## Replay doctrine

`WATCH REPLAY` is a performance of the event log. `REPLAY` in the inspector remains forensic/manual.

A spectator should be able to understand the project journey from the world first and use the inspector as commentary/evidence second.

Sequence:

1. event becomes active;
2. vehicle moves to event progress;
3. checkpoint/state prop appears or changes;
4. camera adopts event grammar;
5. event chyron names what happened;
6. persistent traces from prior events remain where useful;
7. finish creates a verified trophy object tied back to the race replay.

## Guardrails

- Event != progress. Only verified state-changing evidence advances the vehicle.
- Generated != approved. Steward decisions remain authoritative.
- Waiting external is not failure.
- Deliberate rest is not failure.
- No borrowed metaphors from adjacent projects in renderer copy.
- Do not let legacy game state/CSS/physics regain authority over Racecraft state.
- Prefer reinterpreting mature fork primitives over adding disconnected UI decoration.
