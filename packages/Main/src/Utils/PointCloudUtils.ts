import type PointCloudNode from '../Core/PointCloudNode';

// Encoding the octree hierarchy in breadth-first order
// into a texture for adaptive point size rendering
// Explanation p36: https://www.cg.tuwien.ac.at/research/publications/2016/SCHUETZ-2016-POT/SCHUETZ-2016-POT-thesis.pdf
export function computeVisibilityTextureData(nodes: PointCloudNode[]) {
    // sort by level and hierarchy order
    const sort = function sortNodes(a: PointCloudNode, b: PointCloudNode) {
        if (a.depth !== b.depth) { return a.depth - b.depth; }
        // @ts-expect-error PointCloudNode has x properties
        if (a.x !== b.x) { return a.x - b.x; }
        // @ts-expect-error PointCloudNode has y properties
        if (a.y !== b.y) { return a.y - b.y; }
        // @ts-expect-error PointCloudNode has z properties
        return a.z - b.z;
    };
    // breadth-first order
    const orderedNodes =  [...nodes].sort(sort);

    const data = new Uint8Array(orderedNodes.length * 4);
    const visibleNodeTextureOffsets = new Map<string, number>();
    const offsetsToChild: number[] = new Array(orderedNodes.length).fill(Infinity);

    // Helper function to get octree child index from node
    const getChildIndex = (node: PointCloudNode): number => {
        if (!node.parent) {
            return 0;
        }
        const parent = node.parent;
        // @ts-expect-error PointCloudNode has x properties
        const dx = node.x - parent.x * 2;
        // @ts-expect-error PointCloudNode has y properties
        const dy = node.y - parent.y * 2;
        // @ts-expect-error PointCloudNode has z properties
        const dz = node.z - parent.z * 2;
        // Octree child index (Potree convention): 4*x + 2*y + z
        return 4 * dx + 2 * dy + dz;
    };

    for (let nodeIndex = 0; nodeIndex < orderedNodes.length; nodeIndex++) {
        const node = orderedNodes[nodeIndex];
        // @ts-expect-error PointCloudNode has voxelKey properties
        visibleNodeTextureOffsets.set(node.voxelKey, nodeIndex);

        if (node.parent) {
            const childIndex = getChildIndex(node);
            // @ts-expect-error PointCloudNode has voxelKey properties
            const parentIndex = visibleNodeTextureOffsets.get(node.parent.voxelKey);

            if (parentIndex === undefined) {
                continue;
            }

            const parentOffsetToChild = nodeIndex - parentIndex;
            const offsetToFirstChild =
                Math.min(offsetsToChild[parentIndex], parentOffsetToChild);
            offsetsToChild[parentIndex] = offsetToFirstChild;

            // The 8 bits of the red value indicate
            // which of the children are visible
            data[parentIndex * 4] = data[parentIndex * 4] | (1 << childIndex);
            // Offset to child is stored on 2 bytes,
            // so it can support up to 65536 nodes per subtree.
            // The green channel contains the relative offset
            // to the node’s first child (8 most significant bits)
            data[parentIndex * 4 + 1] = offsetToFirstChild >> 8;
            // The blue channel contains the relative offset
            // to the node’s first child (8 least significant bits)
            data[parentIndex * 4 + 2] = offsetToFirstChild % 256;
        }
    }

    return {
        data,
        offsets: visibleNodeTextureOffsets,
    };
}
