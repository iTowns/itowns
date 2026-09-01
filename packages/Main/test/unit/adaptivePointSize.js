import assert from 'assert';
import PointCloudNode, { buildVoxelKey } from 'Core/PointCloudNode';
import { computeVisibilityTextureData } from 'Utils/PointCloudUtils';

function createNode(depth, x, y, z) {
    const node = new PointCloudNode(depth);
    node.x = x;
    node.y = y;
    node.z = z;
    node.voxelKey = buildVoxelKey(depth, x, y, z);
    // Override setOBBes so node.add() doesn't require a real source/crs.
    node.setOBBes = () => {};
    return node;
}

// Counts the number of set bits in `mask` at positions 0..maxIndex (inclusive).
// Mirrors the GLSL helper numberOfOnes() used in PointsVS.glsl.
function numberOfOnes(mask, maxIndex) {
    let count = 0;
    for (let i = 0; i <= maxIndex; i++) {
        if ((mask >> i) & 1) { count++; }
    }
    return count;
}

describe('Adaptive point size', function () {
    describe('computeVisibilityTextureData', function () {
        it('Single visible root → nodeToIndex has one entry', function () {
            const root = createNode(0, 0, 0, 0);

            const { data, nodeToIndex } = computeVisibilityTextureData(root, [root]);

            // BFS should have assigned index 0 to the root.
            assert.strictEqual(nodeToIndex.size, 1);
            assert.strictEqual(nodeToIndex.get(root), 0);

            // Output buffer: 1 node × 4 channels.
            assert.strictEqual(data.length, 4);

            // No visible children → all channels 0.
            assert.strictEqual(data[0], 0, 'R channel (child mask) should be 0');
            assert.strictEqual(data[1], 0, 'G channel (offset high byte) should be 0');
            assert.strictEqual(data[2], 0, 'B channel (offset low byte) should be 0');
        });

        it('3-level tree → correct BFS indices, mask and offset', function () {
            const root   = createNode(0, 0, 0, 0);
            // childA : potree index 0  (dx=0, dy=0, dz=0)
            const childA = createNode(1, 0, 0, 0);
            // childB : potree index 4  (dx=1, dy=0, dz=0)
            const childB = createNode(1, 1, 0, 0);
            // grandChildren of childA (potree indices 0 and 1 relative to childA)
            const childAA = createNode(2, 0, 0, 0);
            const childAB = createNode(2, 0, 0, 1);

            root.add(childA);
            root.add(childB);
            childA.add(childAA);
            childA.add(childAB);

            const visibleNodes = [root, childA, childAA, childAB, childB];
            const { data, nodeToIndex } = computeVisibilityTextureData(root, visibleNodes);

            // BFS assigns root=0, childA=1, childB=2.
            assert.equal(nodeToIndex.get(root),   0);
            assert.equal(nodeToIndex.get(childA), 1);
            assert.equal(nodeToIndex.get(childB), 2);
            assert.equal(nodeToIndex.get(childAA), 3, 'childAA BFS index');
            assert.equal(nodeToIndex.get(childAB), 4, 'childAB BFS index');

            // Root encoding:
            //   mask  = (1 << 0) | (1 << 4) = 1 + 16 = 17
            //   minOffset = min(1-0, 2-0) = 1
            assert.equal(data[0], 17, 'root R channel (child mask)');
            assert.equal(data[1], 0,  'root G channel (offset high byte)');
            assert.equal(data[2], 1,  'root B channel (offset low byte = 1)');

            // childA: both childAA (potree idx 0) and childAB (potree idx 1) are visible.
            //   mask      = (1 << 0) | (1 << 1) = 3
            //   minOffset = min(3-1, 4-1) = 2
            assert.equal(data[4], 3, 'childA R channel (mask for childAA and childAB)');
            assert.equal(data[5], 0, 'childA G channel (offset high byte)');
            assert.equal(data[6], 2, 'childA B channel (offset low byte = 2)');

            // childB has no visible sub-children → its channels remain 0.
            assert.equal(data[8], 0, 'childB R channel');

            // grandChildren have no visible sub-children.
            assert.strictEqual(data[12],  0, 'childAA R channel');
            assert.strictEqual(data[16], 0, 'childAB R channel');

            // --- Octree reconstruction from texture data ---
            // Invert nodeToIndex to get indexToNode
            const indexToNode = new Map();
            for (const [node, idx] of nodeToIndex) {
                indexToNode.set(idx, node);
            }

            // For each visible node, decode its children list from the texture
            const reconstructed = new Map();
            for (const [node, nodeIdx] of nodeToIndex) {
                const mask      = data[nodeIdx * 4];
                const minOffset = (data[nodeIdx * 4 + 1] << 8) | data[nodeIdx * 4 + 2];
                const children  = [];
                for (let bit = 0; bit < 8; bit++) {
                    if ((mask >> bit) & 1) {
                        const childOffset = numberOfOnes(mask, bit - 1);
                        const childIdx    = nodeIdx + minOffset + childOffset;
                        children.push(indexToNode.get(childIdx));
                    }
                }
                reconstructed.set(node, children);
            }

            assert.deepStrictEqual(reconstructed.get(root),   [childA, childB], 'reconstructed root children');
            assert.deepStrictEqual(reconstructed.get(childA), [childAA, childAB], 'reconstructed childA children');
            assert.deepStrictEqual(reconstructed.get(childB), [], 'reconstructed childB has no children');
            assert.deepStrictEqual(reconstructed.get(childAA), [], 'reconstructed childAA has no children');
            assert.deepStrictEqual(reconstructed.get(childAB), [], 'reconstructed childAB has no children');
        });
    });
});
