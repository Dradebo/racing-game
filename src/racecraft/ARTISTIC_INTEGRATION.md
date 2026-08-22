# Artistic Integration Contract

## Why this document exists

Racecraft is built by repurposing an existing racing game as a renderer for real-world striving. This is not a normal feature integration. We are asking authored game art, mechanics, effects, and environments to communicate meanings they were not originally designed to carry.

That only works if implementation respects the original artistic system.

## The failed shortcut

During route integration, several successive shortcuts were attempted:

1. A hand-authored spline was drawn through approximate world coordinates.
2. The spline was replaced with graph search across road-related mesh vertices.
3. The graph path was smoothed with Catmull-Rom interpolation.

Each step improved the implementation in a narrow technical sense while still violating the world.

The visible symptoms were decisive:

- the race car crossed water;
- the line cut bends rather than driving them;
- obstacles appeared in positions that made no visual sense;
- checkpoint and race semantics floated over the environment instead of belonging to it;
- the replay behaved like an overlay on a game rather than a race occurring inside the authored world.

The mistake was not primarily an algorithm error. It was a design-method error.

We tried to infer how to use the art without first learning the rules of the artistic endeavour.

## The principle

> When artistic work is used as implementation material, understanding the rules of that artistic work is a prerequisite for designing the methods that use it.

The game world is not merely input data.

Its geometry, animation, mechanics, visual composition, camera conventions, effects, audio, and interaction patterns together define an artistic grammar.

For Racecraft, that grammar includes questions such as:

- Where is a vehicle naturally expected to travel?
- What counts visually as a road, lane, crossing, pit, hazard, shortcut, or finish?
- Which props are authored to move, and along what axes?
- How does the original camera establish speed, danger, arrival, waiting, or success?
- Which environmental effects imply traction, momentum, impact, weather, distance, or terrain?
- What scale and orientation make a vehicle or obstacle look physically credible?
- What events were originally important enough to receive sound, animation, particles, or camera treatment?

These are implementation facts for a renderer, even if they are not encoded as TypeScript interfaces.

## Correct repurposing method

For every major donor primitive:

### 1. Study original behavior

Read the component, asset structure, animation, store dependencies, physics assumptions, and placement.

### 2. Recover the artistic rule

Do not ask only “what does this code do?” Ask “what role does this play in the experience?”

Examples:

- Boost communicates unusual forward force and speed.
- Skid marks communicate a difficult interaction with the road and persist after the event.
- Dust communicates contact with a loose/rough surface and energetic motion.
- A train crossing communicates an external system temporarily dominating the driver's route.
- A ramp communicates a deliberate break from ordinary road continuity.

### 3. Map Racecraft semantics to the native affordance

Examples:

- verified momentum -> Boost
- recovery after obstruction -> Skid/Dust trace
- external dependency blocking progress -> Train crossing
- circuit mutation/challenge -> Ramp

### 4. Preserve spatial and temporal coherence

A train must cross a place where a train can plausibly cross.
A ramp must align to the road.
A skid mark must lie on the driven surface.
A camera must frame the event using the world's spatial relationships.

### 5. Change authority, not artistic coherence

The original game may have triggered an effect from keyboard input or physics. Racecraft can replace that trigger with canonical real-world state while preserving the effect's authored behavior.

This is the preferred inversion:

`canonical event -> Racecraft meaning -> native game behavior`

not:

`canonical event -> arbitrary new visual placed near old game art`

## Implication for data-driven game front ends

This project is one example of a larger pattern: using game front ends to make device data and accumulated human activity vivid.

Possible sources include:

- work artifacts;
- communication history;
- schedules and obligations;
- health or sensor data;
- environmental readings;
- field devices;
- personal archives;
- autonomous agent activity;
- learning systems;
- household or workplace telemetry.

In these systems, data should not merely be given game-themed labels.

The renderer should translate data into the **native dramatic language of the chosen game form**.

A racing renderer should understand racing.
A platformer renderer should understand traversal, hazards, levels, checkpoints, lives, and spatial mastery.
A tactics renderer should understand units, terrain, range, initiative, positioning, and objectives.
A city-builder renderer should understand flows, resources, infrastructure, congestion, growth, and decay.

The better the implementation understands the source art form, the more useful and less gimmicky the rendering becomes.

## Design test for future agents

Before adding any visual behavior, answer all four:

1. **What real state are we trying to communicate?**
2. **What native game affordance already communicates something structurally similar?**
3. **What authored rules govern that affordance?**
4. **How do we change the trigger without breaking those rules?**

If question 3 has not been answered, implementation should not begin.

## Racecraft quality bar

A successful replay should be understandable at two levels simultaneously:

- a spectator can feel the project journey from the race itself;
- an inspector can verify why every dramatic event occurred from the underlying artifacts.

The world tells the story first.
The evidence explains and proves it second.
