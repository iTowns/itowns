import assert from 'assert';
import sinon from 'sinon';
import * as THREE from 'three';
import PointCloudLayer from 'Layer/PointCloudLayer';

const TTL = 10000;
const EPSILON = 10;

function createClampOBB(
    min = new THREE.Vector3(-1, -1, -1),
    max = new THREE.Vector3(1, 1, 1),
) {
    const obb = new THREE.Object3D();
    obb.box3D = new THREE.Box3(min.clone(), max.clone());
    obb.matrixWorldInverse = new THREE.Matrix4();
    return obb;
}

function createNode(params = {}) {
    const node = {
        numPoints: 100,
        depth: 0,
        sse: -1,
        visible: false,
        notVisibleSince: undefined,
        promise: null,
        obj: undefined,
        children: [],
        pointSpacing: 1,
        clampOBB: createClampOBB(),
        ...params,
    };
    for (const child of node.children) {
        child.parent = node;
    }
    return node;
}

function createContext(params = { camera: {}, scheduler: {}, view: {} }) {
    return {
        camera: {
            camera3D: new THREE.PerspectiveCamera(60, 1, 0.1, 1000),
            preSSE: 1,
            width: 800,
            height: 600,
            isBox3Visible: () => true,
            ...params.camera,
        },
        scheduler: {
            execute: () => new Promise(() => {}),
            ...params.scheduler,
        },
        view: {
            notifyChange: () => {},
            ...params.view,
        },
    };
}

function createLoadedObj(node, layer) {
    const obj = new THREE.Points();
    obj.visible = false;
    obj.userData.node = node;
    layer.group.add(obj);
    node.obj = obj;
    return obj;
}

function runUpdate(layer, context, root) {
    const queue = [root];
    while (queue.length > 0) {
        const node = queue.shift();
        const next = layer.update(context, layer, node);
        if (next) {
            queue.push(...next);
        }
    }
}

function assertNodeVisible(n, layer) {
    assert.ok(n.visible, 'Expected node to be visible');
    assert.ok(layer._visibleNodes.has(n), 'Expected node to be in set of visible nodes');
}

function assertNodeNotVisible(n, layer) {
    assert.ok(!n.visible, 'Expected node to be not visible');
    assert.ok(!layer._visibleNodes.has(n), 'Expected node to not be in set of visible nodes');
}

function assertNodeChangeVisible(n, call) {
    const event = call.firstArg;
    assert.strictEqual(event.tile, n, 'Expected event.tile to be n');
    assert.ok(event.visible, 'Expected event.visible to be true');
    assert.strictEqual(n.notVisibleSince, undefined, 'Expected n to be set for disposal');
}

function assertNodeChangeInvisible(n, call) {
    const event = call.firstArg;
    assert.strictEqual(event.tile, n, 'Expected event.tile to be n');
    assert.ok(!event.visible, 'Expected event.visible to be false');
    assert.notStrictEqual(n.notVisibleSince, undefined, 'Expected n to be cleared from disposal');
}

describe('PointCloudLayer', function () {
    const source = {};
    let layer;

    beforeEach(function () {
        layer = new PointCloudLayer('test', { source });
        layer.material = {
            visible: undefined,
            opacity: undefined,
            size: undefined,
        };
        layer.root = createNode({ numPoints: 500 });
    });

    describe('preUpdate()', function () {
        it('returns root node', function () {
            const context = createContext();
            const result = layer.preUpdate(context);
            assert.deepStrictEqual(result, [layer.root]);
        });
    });

    describe('update()', function () {
        let sandbox;
        let loadData;
        beforeEach(function () {
            sandbox = sinon.createSandbox();
            loadData = sandbox.stub(layer, 'loadData');
        });

        afterEach(function () {
            sandbox.restore();
        });

        it('does not trigger data loading for culled nodes', function () {
            const n = createNode();
            const context = createContext({ camera: { isBox3Visible: () => false } });

            layer.update(context, layer, n);

            assert.ok(loadData.notCalled, 'Expected loadData to not be called');
        });

        it('triggers data loading when not culled', function () {
            const n = createNode({ notVisibleSince: Date.now() });
            const context = createContext({ camera: { isBox3Visible: () => true } });

            layer.update(context, layer, n);

            assert.ok(loadData.calledOnce, 'Expected loadData to be called once');
            assert.ok(loadData.calledWith(n), 'Expected loadData to be called with n');
        });

        it('does not traverse descendants when culled', function () {
            const grandchild = createNode({ depth: 2 });
            const child = createNode({ depth: 1, children: [grandchild] });
            const parent = createNode({ depth: 0, children: [child] });
            const context = createContext({ camera: { isBox3Visible: () => false } });

            layer.update(context, layer, parent);

            assert.ok(loadData.notCalled, 'Expected loadData to not be called');
        });

        it('does not traverse culled child of non-culled parent', function () {
            const child = createNode({ depth: 1 });
            const parent = createNode({ depth: 0, children: [child] });
            const context = createContext({
                // isBox3Visible rejects only the child's bbox
                camera: { isBox3Visible: bbox => bbox !== child.clampOBB.box3D },
            });

            runUpdate(layer, context, parent);

            assert.ok(loadData.calledOnce, 'Expected loadData to be called exactly once');
            assert.ok(loadData.calledWith(parent), 'Expected loadData to be called with parent');
        });

        it('traverses children when parent SSE >= 1', function () {
            const child0 = createNode({ numPoints: 100, depth: 1 });
            const child1 = createNode({ numPoints: 100, depth: 1 });
            const parent = createNode({ numPoints: 500, children: [child0, child1] });
            const context = createContext({ camera: { isBox3Visible: () => true } });

            runUpdate(layer, context, parent);

            assert.ok(loadData.calledThrice, 'Expected loadData to be called exactly three times');
            const { firstCall, secondCall, thirdCall } = loadData;
            assert.ok(firstCall.calledWith(parent), 'Expected loadData to be called with parent');
            assert.ok(secondCall.calledWith(child0), 'Expected loadData to be called with child0');
            assert.ok(thirdCall.calledWith(child1), 'Expected loadData to be called with child1');
        });

        it('does not traverse children when parent SSE < 1', function () {
            const child0 = createNode({ numPoints: 100, depth: 1 });
            const child1 = createNode({ numPoints: 100, depth: 1 });
            const parent = createNode({ numPoints: 500, children: [child0, child1] });
            const context = createContext({ camera: { isBox3Visible: () => true } });

            // move camera far away
            context.camera.camera3D.position.set(0, 0, 1000);
            context.camera.preSSE = 0.001;

            runUpdate(layer, context, parent);

            assert.ok(loadData.calledOnce, 'Expected loadData to be called once');
            assert.ok(loadData.calledWith(parent), 'Expected loadData to be called with parent');
        });
    });

    describe('loadData()', function () {
        let context;
        let request;
        beforeEach(function () {
            request = sinon.spy((() => new Promise(() => {})));
            context = createContext({ scheduler: { execute: request } });
        });

        it('requests data when the node is not yet loaded', function () {
            const node = createNode({ numPoints: 500 });
            layer.loadData(node, context, layer, 0);
            assert.ok(request.calledOnce, 'Expected request to be scheduled once');
        });

        it('does not request data when the node has no points', function () {
            const node = createNode({ numPoints: 0 });
            layer.loadData(node, context, layer, 0);
            assert.ok(request.notCalled, 'Expected request to not be scheduled');
        });

        it('does not request data when a node is loading', function () {
            const node = createNode({ numPoints: 500, promise: new Promise(() => {}) });
            layer.loadData(node, context, layer, 0);
            assert.ok(request.notCalled, 'Expected request to not be scheduled');
        });

        it('does not request data when a node is loaded', function () {
            const node = createNode({ numPoints: 500, obj: new THREE.Points() });
            layer.loadData(node, context, layer, 0);
            assert.ok(request.notCalled, 'Expected request to not be scheduled');
        });
    });

    describe('postUpdate()', function () {
        let sandbox;

        beforeEach(function () {
            sandbox = sinon.createSandbox();
        });

        afterEach(function () {
            sandbox.restore();
        });

        it('shows in-budget nodes', function () {
            layer.pointBudget = 1000;
            layer._visibleNodes = new Set();
            const nodeA = createNode({ numPoints: 300, sse: 2 });
            const nodeB = createNode({ numPoints: 200, sse: 1 });

            layer._candidateNodes.push(nodeA);
            layer._candidateNodes.push(nodeB);
            layer.postUpdate();

            assertNodeVisible(nodeA, layer);
            assertNodeVisible(nodeB, layer);
            assert.strictEqual(
                layer.displayedCount, nodeA.numPoints + nodeB.numPoints,
                'Expected displayed count to be the number of visible points',
            );
        });

        it('hides over-budget nodes', function () {
            layer.pointBudget = 400;
            layer._visibleNodes = new Set();
            const nodeA = createNode({ numPoints: 300, sse: 2 });
            const nodeB = createNode({ numPoints: 200, sse: 1 });

            layer._candidateNodes.push(nodeA);
            layer._candidateNodes.push(nodeB);
            layer.postUpdate();

            assertNodeVisible(nodeA, layer);
            assertNodeNotVisible(nodeB, layer);
            assert.strictEqual(
                layer.displayedCount, nodeA.numPoints,
                'Expected displayed count to be the number of visible points',
            );
        });

        it('emits visibility change event when node becomes visible', function () {
            const listener = sinon.spy();
            const n = createNode({ numPoints: 100, sse: 1 });
            layer.addEventListener('node-visibility-change', listener);

            // Frame 1 : set node as visible
            layer._candidateNodes.push(n);
            layer.postUpdate();

            assert.ok(listener.calledOnce, 'Expected listener to be called once');
            assertNodeChangeVisible(n, listener.firstCall);

            // Frame 2 : keep node as visible
            layer._candidateNodes.push(n);
            layer.postUpdate();
            assert.ok(listener.calledOnce, 'Expected listener to not be called again');

            layer.removeEventListener('node-visibility-change', listener);
        });

        it('emits visibility change event when node becomes not visible', function () {
            const listener = sinon.spy();
            const n = createNode({ numPoints: 100, sse: 1 });
            layer.addEventListener('node-visibility-change', listener);


            // Frame 1 : set node as visible
            layer._candidateNodes.push(n);
            layer.postUpdate();

            // Frame 2 : set node as not visible
            layer.postUpdate();

            assert.ok(listener.calledTwice, 'Expected listener to be called twice');
            assertNodeChangeInvisible(n, listener.secondCall);

            // Frame 3 : keep node as not visible
            layer.postUpdate();
            assert.ok(listener.calledTwice, 'Expected listener to not be called again');

            layer.removeEventListener('node-visibility-change', listener);
        });

        it('emits visibility change event when node becomes over-budget', function () {
            const listener = sinon.spy();
            const n = createNode({ numPoints: 100, sse: 1 });
            layer.addEventListener('node-visibility-change', listener);

            // Frame 1 : set node as visible
            layer._candidateNodes.push(n);
            layer.postUpdate();

            // Frame 2 : set node as over-budget
            layer.pointBudget = 0;
            layer._candidateNodes.push(n);
            layer.postUpdate();

            assert.ok(listener.calledTwice, 'Expected listener to be called twice');
            assertNodeChangeInvisible(n, listener.secondCall);
        });

        it('never collects points whose are not set for disposal', function () {
            const node = createNode({ numPoints: 100 });
            const obj = createLoadedObj(node, layer);
            node.notVisibleSince = undefined;

            const dispose = sandbox.spy(obj.geometry, 'dispose');
            layer.postUpdate();
            assert.ok(dispose.notCalled, 'Expected geometry.dispose() to not be called');
            assert.strictEqual(node.obj, obj, 'Expected node.obj to be the points');
        });

        it('collects points after disposal timeout', function () {
            const node = createNode({ numPoints: 100 });
            const obj = createLoadedObj(node, layer);
            node.notVisibleSince = Date.now() - (TTL + EPSILON);

            const dispose = sandbox.spy(obj.geometry, 'dispose');

            layer.postUpdate();

            assert.strictEqual(node.obj, undefined, 'Expected node.obj to be cleared');
            assert.ok(dispose.calledOnce, 'Expected geometry.dispose() to be called');
            assert.strictEqual(
                layer.group.children.length, 0,
                'Expected points to be removed from the rendering group',
            );
        });

        it('keeps points alive before disposal timeout', function () {
            const node = createNode({ numPoints: 100 });
            const obj = createLoadedObj(node, layer);
            node.notVisibleSince = Date.now() - (TTL - EPSILON);

            const points = obj;
            const dispose = sandbox.spy(points.geometry, 'dispose');

            layer.postUpdate();

            assert.ok(dispose.notCalled, 'Expected geometry.dispose() to not be called');
            assert.strictEqual(node.obj, points, 'Expected node.obj to be the points');
            assert.strictEqual(
                layer.group.children.length, 1,
                'Expected points to remain in the rendering group',
            );
        });

        it('collects all expired objects in a single pass', function () {
            const nodes = Array.from({ length: 3 }, () => {
                const node = createNode({ numPoints: 100 });
                const obj = createLoadedObj(node, layer);
                node.notVisibleSince = Date.now() - (TTL + EPSILON);
                return { node, dispose: sandbox.spy(obj.geometry, 'dispose') };
            });

            layer.postUpdate();

            for (const { node, dispose } of nodes) {
                assert.ok(dispose.calledOnce, 'Expected geometry.dispose() to be called');
                assert.strictEqual(node.obj, undefined);
            }
            assert.strictEqual(layer.group.children.length, 0);
        });
    });

    describe('Unexpected behavior', function () {
        // Memory leak scenario : a node that was always culled/over-budget
        // (i.e. never entered _visibleNodes) has its loadData promise resolve.
        // The obj is silently added to layer.group but never scheduled for
        // disposal.
        it('disposes points loaded for node never visible', async function () {
            const node = createNode({ numPoints: 100, visible: true });
            const pts = new THREE.Points();
            pts.userData.node = node;

            const context = createContext({
                scheduler: { execute: () => sinon.spy(Promise.resolve(pts)) },
            });

            layer.pointBudget = 0;
            layer.loadData(node, context, layer, 0);
            layer._candidateNodes.push(node);
            layer.postUpdate();

            await context.scheduler.execute();

            assert.strictEqual(
                layer.group.children.length, 1,
                'Expected points to be in group',
            );
            assert.ok(!pts.visible, 'Expected points to be hidden');
            assert.notStrictEqual(
                node.notVisibleSince, undefined,
                'Expected node to be set for disposal',
            );
        });

        // Memory leak scenario : a node that was changed to not visible before
        // the points were loaded. The points are never collected.
        it('disposes points loaded after nodes become not visible', async function () {
            const node = createNode({ numPoints: 100, visible: true });
            const pts = new THREE.Points();
            pts.userData.node = node;

            const context = createContext({
                scheduler: { execute: () => sinon.spy(Promise.resolve(pts)) },
            });

            layer.loadData(node, context, layer, 0);
            layer.setNodeVisible(node, false); // points set invisible before request finish

            await context.scheduler.execute();

            assert.strictEqual(
                layer.group.children.length, 1,
                'Expected points to be in group',
            );
            assert.ok(!pts.visible, 'Expected points to be hidden');
            assert.notStrictEqual(
                node.notVisibleSince, undefined,
                'Expected node to be set for disposal',
            );
        });
    });
});
