import type PotreeSource from 'Source/PotreeSource';
import { buildVoxelKey } from 'Core/PointCloudNode';
import PotreeNodeBase, { getChildVoxelKey, type NodeKeyInfo } from 'Core/PotreeNodeBase';

const defaultNumPoints = 9999;
export type PotreeNodeHierarchy = {
    hierarchyKey: string,
    numPoints: number, // uint32
}

type NodeInfo  = NodeKeyInfo  & {
    hierarchyKey: string,
}

function parseHierarchy(view: DataView, nodeInfo: NodeInfo, hierarchyStepSize: number)
        : Record<string, PotreeNodeHierarchy> {
    const stack = [];

    const hierarchy: Record<string, PotreeNodeHierarchy> = {};

    let offset = 0;
    const byteLength = view.byteLength;

    stack.push(nodeInfo);

    while (stack.length && offset < byteLength) {
        const cNodeInfo = stack.shift() as NodeInfo;
        const childrenBitField = view.getUint8(offset);
        let numPoints = view.getUint32(offset + 1, true);

        // In potree 1.7 there is a bug with the numPoints
        // (set to 0 even if there is point in the associated bin)
        // of the last level when we reach source.hierarchyStepSize.
        // It can be the last level of the hierarchy, or in the
        // sub-hierarchy if there is children or grand-children (and
        // only these will be impacted)

        if (cNodeInfo.depth - nodeInfo.depth === hierarchyStepSize) {
            numPoints = -1;// to load the subHierarchy when needed
        }

        if (cNodeInfo.depth >= hierarchyStepSize) {
            // for bug v1.7
            numPoints = numPoints || defaultNumPoints;
        }

        const voxelKey = buildVoxelKey(
            cNodeInfo.depth, cNodeInfo.x, cNodeInfo.y, cNodeInfo.z);
        hierarchy[voxelKey] = {
            hierarchyKey: cNodeInfo.hierarchyKey,
            numPoints,
        };

        // look up 8 children
        for (let childIndex = 0; childIndex < 8; childIndex++) {
            // does snode have a #childIndex child ?
            if (childrenBitField & (1 << childIndex)) {
                const { depth, x, y, z } = getChildVoxelKey(cNodeInfo, childIndex);

                stack.push({
                    depth,
                    x,
                    y,
                    z,
                    hierarchyKey: `${cNodeInfo.hierarchyKey}${childIndex}`,
                });
            }
        }
        offset += 5;
    }
    return hierarchy;
}

class PotreeNode extends PotreeNodeBase {
    source: PotreeSource;

    override url: string;

    hierarchy: Record<string, PotreeNodeHierarchy>;

    override voxelKey: string;

    private baseurl: string;

    hierarchyKey: string;

    constructor(
        depth: number,
        x: number, y: number, z: number,
        source: PotreeSource,
        crs: string,
        hierarchy: Record<string, PotreeNodeHierarchy> = {},
    ) {
        const voxelKey = buildVoxelKey(depth, x, y, z);
        const numPoints = hierarchy[voxelKey]?.numPoints ?? -1;
        super(depth, x, y, z, numPoints, crs);

        this.source = source;

        this.voxelKey = voxelKey;

        this.baseurl = this.source.baseurl;

        this.hierarchy = hierarchy;

        // potree 1.X
        this.hierarchyKey = hierarchy[voxelKey]?.hierarchyKey || 'r';
        const hierarchyStepSize = this.source.hierarchyStepSize;
        if (depth >= hierarchyStepSize) {
            this.baseurl =
                `${this.baseurl}/${this.hierarchyKey.substring(1, hierarchyStepSize + 1)}`;
        }
        this.url = `${this.baseurl}/${this.hierarchyKey}.bin`;
    }

    override get networkOptions(): RequestInit {
        return this.source.networkOptions;
    }

    override fetcher(url: string, networkOptions = this.networkOptions): Promise<ArrayBuffer> {
        const fetcher = this.source.fetcher(url, networkOptions);
        // bug v1.7 update of numPoints
        if ((this.numPoints === 0 || this.numPoints === defaultNumPoints)
                && url.slice(-3) === 'bin') {
            fetcher
                .then((res: ArrayBuffer) => {
                    this.numPoints = res.byteLength / 16;
                });
        }
        return fetcher;
    }

    async loadHierarchy(): Promise<Record<string, PotreeNodeHierarchy>> {
        if (this.hierarchyIsLoaded) {
            return this.hierarchy;
        }
        const hierarchyUrl = `${this.baseurl}/${this.hierarchyKey}.${this.source.extensionOctree}`;
        const buffer = await this.fetcher(hierarchyUrl);
        const view = new DataView(buffer);

        this.hierarchy = parseHierarchy(view, this, this.source.hierarchyStepSize);

        // update current node from the newly fetched hierarchy buffer
        this.numPoints = view.getUint32(1, true);

        return this.hierarchy;
    }

    findAndCreateChild(
        depth: number, x: number, y: number, z: number,
    ): void {
        const childVoxelKey = buildVoxelKey(depth, x, y, z);

        if (!this.hierarchy[childVoxelKey]) { return; }

        const child = new PotreeNode(
            depth, x, y, z,
            this.source,
            this.crs,
            this.hierarchy,
        );

        this.add(child as this);
    }
}

export default PotreeNode;
