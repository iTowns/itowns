import type PointCloudNode from '../Core/PointCloudNode';

// Returns the Potree child index (0-7) of a node relative to its parent
// based on coordinates (convention: 4*dx + 2*dy + dz)
function getPotreeChildIndex(parent: PointCloudNode, child: PointCloudNode): number {
    const dx = child.x - parent.x * 2;
    const dy = child.y - parent.y * 2;
    const dz = child.z - parent.z * 2;
    return 4 * dx + 2 * dy + dz;
}

function encodeChildrenVisibility(node: PointCloudNode, nodeIndex: number,
    nodeToIndex: Map<PointCloudNode, number>): { minOffset: number; childVisibilityMask: number } {
    let minOffset = Infinity;
    let childVisibilityMask = 0;

    for (const child of node.children) {
        const childIndex = nodeToIndex.get(child);
        if (childIndex === undefined) {
            continue;
        }

        childVisibilityMask |= (1 << getPotreeChildIndex(node, child));

        const offset = childIndex - nodeIndex;
        if (offset < minOffset) {
            minOffset = offset;
        }
    }

    return {
        minOffset,
        childVisibilityMask,
    };
}

// Encoding the octree hierarchy in breadth-first order
// into a texture for adaptive point size rendering
// Explanation p36: https://www.cg.tuwien.ac.at/research/publications/2016/SCHUETZ-2016-POT/SCHUETZ-2016-POT-thesis.pdf
export function computeVisibilityTextureData(root: PointCloudNode, visibleNodes: PointCloudNode[]) {
    const visibleSet = new Set(visibleNodes);

    const nodeToIndex = new Map<PointCloudNode, number>();
    const queue: PointCloudNode[] = [root];
    let index = 0;
    while (queue.length > 0) {
        const node = queue.shift() as PointCloudNode;
        if (!visibleSet.has(node)) {
            continue;
        }
        nodeToIndex.set(node, index++);
        for (const child of node.children) {
            queue.push(child);
        }
    }

    const data = new Uint8Array(visibleNodes.length * 4);

    for (const [node, nodeIndex] of nodeToIndex) {
        const { minOffset, childVisibilityMask } =
            encodeChildrenVisibility(node, nodeIndex, nodeToIndex);

        if (minOffset === Infinity) {
            continue;
        }

        // Red channel: bitmask of which children are visible
        data[nodeIndex * 4] = childVisibilityMask;
        // Offset to child is stored on 2 bytes,
        // so it can support up to 65536 nodes per subtree.
        // The green channel contains the relative offset
        // to the node's first child (8 most significant bits)
        data[nodeIndex * 4 + 1] = minOffset >> 8;
        // The blue channel contains the relative offset
        // to the node's first child (8 least significant bits)
        data[nodeIndex * 4 + 2] = minOffset % 256;
    }

    return {
        data,
        nodeToIndex,
    };
}
