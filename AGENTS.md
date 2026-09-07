# Agent Rules for Striving Observation / Racecraft

## Prime directive: understand the artistic system before repurposing it

This repository is not being used in the conventional direction. The original racing game was designed around player input, physics, authored track geometry, checkpoints, camera assumptions, effects, and environmental composition. Racecraft reverses that causality: real-world state and artifacts drive the game world, which renders the consequences.

That inversion makes the original game's artistic and mechanical rules part of the implementation contract.

### Do not treat game art as decoration

When reusing an artistic interactive system, the art is not a pile of interchangeable meshes, textures, effects, and sounds around the code. It encodes:

- valid spatial relationships;
- implied paths and movement;
- scale and orientation;
- timing and rhythm;
- affordances and expectations;
- environmental storytelling;
- mechanical meaning;
- camera language;
- visual hierarchy;
- what feels possible or impossible inside the world.

An implementation that is logically correct but violates those authored rules is incorrect for this project.

### Required method before using an artistic primitive

Before repurposing a track, vehicle, obstacle, effect, camera, animation, environment, or sound:

1. Inspect how the original game uses it.
2. Understand the authored spatial/mechanical assumptions it depends on.
3. Identify which of those assumptions are essential to the artistic result.
4. Map the Racecraft meaning onto those constraints.
5. Reuse the primitive in a way that preserves its visual/mechanical coherence.
6. Only then change its trigger or semantics.

Prefer changing **why** a primitive activates over changing **how** the primitive naturally belongs in the world.

Example: the original Boost effect may have been triggered by a boost control. Racecraft may trigger it from verified momentum, but the effect should still behave like a vehicle boost effect rather than becoming an unrelated floating particle decoration.

## Postmortem: the route-following shortcut

A failed implementation attempted to make Racecraft follow the track by:

- hand-authoring a five-point Catmull-Rom spline;
- then replacing it with shortest-path/A* traversal across track mesh vertices;
- then smoothing that path back into a spline;
- then attempting a center-biased geodesic over road-like mesh topology.

These approaches looked technically defensible but were artistically false because they asked scenery geometry to infer a driver's legal traversal after the fact.

Observed failures included:

- the car wading through water;
- movement cutting across authored road bends;
- barriers and condition props landing in nonsensical positions;
- semantic events appearing disconnected from the road;
- replay looking like geometry laid on top of the game rather than a race occurring inside it.

The core mistake was solving **geometry** before understanding **the road as an authored artistic/mechanical object**.

The road is not merely a set of vertices between two coordinates. It has lane width, center bias, bends, visual boundaries, implied driving direction, obstacles, transitions, and scene composition. A shortest path can be mathematically valid while being completely wrong as a race line.

### Approved route-authority method

For this donor game, the preferred Racecraft route authority is a **captured legal lap from the donor game's own driving system**.

The capture process temporarily restores the original vehicle, controls, physics, terrain collision, checkpoints, finish trigger, camera behavior, obstacles, and world. A clean lap is driven using those native rules and sampled as position/orientation telemetry.

That telemetry becomes the canonical cinematic traversal trace.

Normal Racecraft then maps project progress onto that trace. Racecraft does **not** regain player-driving authority; the original game is used only to teach the renderer how its world is legitimately traversed.

Hierarchy:

1. captured native legal-lap trace — preferred route authority;
2. authored explicit route/AI/navigation data, if later discovered — equally valid donor authority;
3. inferred mesh route — diagnostic/fallback only, never treated as artistically verified.

Do not claim track-following is fixed until a captured lap has been visually replayed and shown to remain on a believable authored driving line.

### Rule derived from the failure

> Never infer a replacement control structure from artistic geometry until you understand the original artistic/mechanical structure that geometry was built to serve.

If the original system already contains a path, checkpoint ordering, navigation logic, AI line, race line, animation path, recorded replay, or other authored movement representation, find and reuse that first.

If it does not, observe or record the native interaction that legitimately traverses the art before inventing a replacement path.

## Racecraft-specific consequence

Racecraft should repurpose the fork by preserving the world's internal coherence while replacing its source of truth.

Good inversion:

`real event -> Racecraft state -> original game primitive activates in a semantically appropriate way`

Bad inversion:

`real event -> arbitrary custom geometry/effect placed somewhere near an existing game asset`

The goal is for replay to look like the original world has learned how to tell the story of the work.

## Private evidence boundary

Racecraft may use private Drive, email, chat, calendar, or local artifacts to reconstruct canonical state, but private evidence must not be copied into this public renderer repository merely because it informed a race transition.

The public renderer may carry a safe state/event description and confidence level. Sensitive provenance belongs behind the private state-provider boundary.

`private evidence -> canonical state transition -> safe renderer state`

not:

`private evidence -> public repository payload`

## Broader Retro Game Renderer lesson

This principle generalizes to any project that uses game front ends to make device data, personal state, sensor data, work history, or agent state vivid and legible.

A platformer, racing game, RPG, tactics game, city builder, or simulation each has its own artistic grammar. The renderer should translate data into that grammar rather than treating the game as a themed dashboard.

The reusable architecture is:

`canonical state -> semantic interpretation -> native game affordance -> authored presentation`

The more faithfully the implementation understands the artistic system, the more surprising and coherent the repurposing can become.
