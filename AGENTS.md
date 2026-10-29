# iTowns Development Instructions

## Core principles

- Follow the repository's existing architecture, conventions, and APIs.
- Design and implement changes to be robust, easy to maintain, and easy to evolve.
- Search for existing utilities, helpers, tests, and patterns before implementing new ones. Reuse them when they fit the requirement.
- When designing or replacing features, study proven implementations and patterns from MapLibre, Cesium, and OpenLayers to find simple, performant solutions. For both existing and new functionality, evaluate whether a suitable package can replace bespoke code, considering its fit with iTowns, performance, and maintenance cost.
- Design objects and modules to be as independent as practical, with clear responsibilities and minimal coupling. Before adding or modifying code, identify which object or abstraction should own that responsibility and keep the behavior there.
- Keep changes focused. Avoid duplicate code, unnecessary dependencies, dead code, and unrelated refactoring.
- Preserve existing behavior and public APIs unless the task explicitly requires a change.
- Match the language and style of the files you touch. The codebase uses both JavaScript and TypeScript; do not convert files between them without a clear need.
- Use explicit, descriptive names for constants and remove obsolete comments.
- For major changes, open a proposal issue before implementation. Keep pull requests focused and split unrelated scopes.
- When adding or upgrading third-party dependencies, update `LICENSE.md` and verify license and intellectual-property compatibility.
- In performance-sensitive paths, avoid unnecessary object allocations and update objects only when needed.

## Repository architecture

The repository is an npm monorepo. Respect package ownership and avoid introducing dependency cycles or moving functionality across package boundaries without a clear architectural reason.

- `packages/Geographic` contains public geographic utilities, including coordinates, extents, ellipsoids, and rotations.
- `packages/Main` contains the public core and functionality that has not yet been extracted into separate packages.
- `packages/Debug` and `packages/Widgets` are currently private packages.

Within `packages/Main`, follow the responsibility of the existing abstraction:

### Responsibilities

- `View` coordinates the view, layers, camera, and rendering.
- `MainLoop` orchestrates camera updates, layer updates, and rendering.
- Use `Source` (or a specialized `Source` subclass) to declare a data source and its access properties, such as URL, format, CRS, extent, network options, `Fetcher`, and `Parser`. Layers consume the source and orchestrate its use; avoid duplicating source configuration on the layer.
- A `Layer` acquires data from its `Source` according to the `View`'s display and update requests; its `Style` is applied to control how the layer is presented. Keep data acquisition and orchestration on the layer, and presentation options in its `Style`.

### Update lifecycle

- Use the existing `preUpdate`, `update`, and `postUpdate` lifecycle; extend it rather than introducing a competing update path.
- Do not use `MainLoop` events or frame requesters to update layer data. Route data selection, loading, and cleanup through the layer lifecycle; reserve `MainLoop` events for frame-level coordination.
- Use a layer's `visible` property to control whether it is displayed, and `frozen` to suspend its refresh/update processing. Keep these lifecycle controls distinct.
- Use `notifyChange()` and existing frame-requester mechanisms to schedule work. Avoid continuous rendering when an event-driven update is sufficient.

### Data loading architecture

- Target this data-loading sequence for accepted, non-cancelled scheduler commands: fetch with a `Fetcher`, parse with a `Parser`, then convert the parsed result with a `Converter` into a Three.js renderable such as a `THREE.Object3D` or `THREE.Texture`.
- As `Provider` is removed, keep the `Scheduler` focused on cross-cutting command concerns such as queueing, prioritization, concurrency, cancellation, and command results; do not put format-specific processing there.
- `Provider` is a legacy abstraction that adds indirection and is still used by parts of the current implementation. Do not add new provider logic; migrate existing responsibilities incrementally to the appropriate per-node data object, `Fetcher`, `Parser`, or `Converter`.
- Generalize `Promise.allSettled`-based partial loading so any scheduler command with independent sub-requests can opt into it, rather than limiting the behavior to `DataSourceProvider`. Preserve successful partial results and reject when all sub-requests fail; do not use partial success where the operation requires atomic completion.
- Progressively favor a `Layer` plus per-node data objects architecture for data-bearing layers: the layer owns shared configuration and orchestration, while each node's object owns its data, in-flight load, state, and resources. A node object's `load()` (for example, `RasterTile.load()`) should submit a command to the `Scheduler` and be invoked through the layer's `update()` lifecycle.
- Point-cloud layers currently select nodes in `update()` and call `loadData()`, which submits scheduler commands. Preserve that existing behavior while migrating incrementally toward the per-node data-object model; do not create a competing update path.
- Make node loading safe across cancellation and changing visibility: avoid duplicate in-flight loads, do not attach results that are no longer relevant, and release owned resources when nodes or layers are removed. Keep cache ownership and invalidation explicit.

### Reuse and design checks

- Consolidate genuinely shared behavior into reusable methods and feature-focused modules. Put family-wide behavior in a parent class and specifics in child classes, following the `RasterLayer` pattern, where `ColorLayer` and `ElevationLayer` implement their specifics. Prefer polymorphism or explicit hooks to repeated checks of concrete layer types; use composition when behavior is shared across unrelated families.
- Before adding or modifying shared behavior, trace its call path and inspect nearby implementations and tests. Choose the narrowest abstraction that owns the responsibility.
- Before implementing, ask: which object owns this behavior? Who owns and releases its resources? What happens on cancellation or when the result becomes stale?

### Rendering

- Keep layer visual styling and presentation options in the layer's `Style` object. Keep data-source, loading, and processing configuration on the layer or its per-node data objects.
- Keep rendering changes within the existing renderer and material abstractions. Reuse current WebGL/WebGPU-compatible patterns instead of adding backend-specific logic unnecessarily.

## Source and generated files

- Make implementation changes in the relevant package's source tree, normally under `packages/<Package>/src`.
- Treat `lib/` and `dist/` as generated output. Do not edit them directly unless explicitly requested.
- Update public documentation or examples when a change affects a public API or user-visible behavior. When adding public API, include reference documentation with code examples; provide a new example for significant features.

## Tests and validation

- For new features, follow [test-driven development](https://fr.wikipedia.org/wiki/Test_driven_development): write a focused test first, run it to confirm it fails, implement the feature, then rerun the test and refactor while keeping it green.
- Add or update focused tests for behavior changes, following the test patterns in the owning package.
- Run the narrowest relevant test first, then broaden validation when a shared contract or multiple packages are affected.
- Use the repository scripts as appropriate: `npm run lint`, `npm run typecheck`, `npm run test-unit`, and `npm test`.
- Report checks that could not be run; do not claim unverified behavior is tested.