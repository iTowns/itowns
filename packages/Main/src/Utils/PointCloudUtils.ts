import TinyQueue from 'tinyqueue';

import type PointCloudNode from '../Core/PointCloudNode';

function encodeChildrenVisibility(node: PointCloudNode): number {
    let mask = 0;
    for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child === undefined) {
            continue;
        }
        mask |= (1 << i);
        mask |= encodeChildrenVisibility(child);
    }
    return mask;
}

function encodeFirstVisibleChildOffset(
    parentIndex: number,
    children: PointCloudNode[],
    nodeToIndex: Map<PointCloudNode, number>,
): number {
    let minOffset = Infinity;
    for (const child of children) {
        const childIndex = nodeToIndex.get(child);
        if (childIndex === undefined) {
            continue;
        }
        const offset = childIndex - parentIndex;
        if (offset >= 0 && offset < minOffset) {
            minOffset = offset;
        }
    }
    return minOffset === Infinity ? -1 : minOffset;
}

// Encoding the octree hierarchy in breadth-first order
// into a texture for adaptive point size rendering
// Explanation p36: https://www.cg.tuwien.ac.at/research/publications/2016/SCHUETZ-2016-POT/SCHUETZ-2016-POT-thesis.pdf
export function computeVisibilityTextureData(root: PointCloudNode, visibleNodes: PointCloudNode[]) {
    const nodeToIndex = new Map<PointCloudNode, number>();
    const queue = new TinyQueue<PointCloudNode>([root]);
    let index = 0;
    while (queue.length > 0) {
        const node = queue.pop() as PointCloudNode;
        if (!visibleNodes.includes(node)) {
            continue;
        }
        nodeToIndex.set(node, index++);
        for (const child of node.children) {
            queue.push(child);
        }
    }

    const data = new Uint8Array(visibleNodes.length * 4);

    for (const [node, index] of nodeToIndex) {
        if (node.children.length === 0) {
            continue;
        }
        const offsetToFirstChild =
            encodeFirstVisibleChildOffset(index, node.children, nodeToIndex);
        if (offsetToFirstChild === -1) {
            continue;
        }
        // Red channel: bitmask of which children are visible
        data[index * 4] = encodeChildrenVisibility(node);
        // Offset to child is stored on 2 bytes,
        // so it can support up to 65536 nodes per subtree.
        // The green channel contains the relative offset
        // to the node’s first child (8 most significant bits)
        data[index * 4 + 1] = offsetToFirstChild >> 8;
        // The blue channel contains the relative offset
        // to the node’s first child (8 least significant bits)
        data[index * 4 + 2] = offsetToFirstChild % 256;
    }

    return {
        data,
        nodeToIndex,
    };
}
