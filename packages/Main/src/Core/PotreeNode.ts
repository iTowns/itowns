import PotreeNodeBase from 'Core/PotreeNodeBase';
import type PotreeSource from 'Source/PotreeSource';

export type PotreeNodeInfo = {
    childrenBitField: number, // 0 <= integer <= 255
    numPoints: number, // integer >= 0
}

class PotreeNode extends PotreeNodeBase {
    source: PotreeSource;

    hierarchyKey: string;
    hierarchy: Record<string, PotreeNodeInfo>;

    childrenBitField: number;

    private baseurl: string;

    constructor(
        hierarchyKey: string,
        source: PotreeSource,
        crs: string,
        hierarchy: Record<string, PotreeNodeInfo> = {},
    ) {
        const depth = hierarchyKey.length - 1;
        const numPoints = hierarchy[hierarchyKey]?.numPoints ?? -1;
        super(depth, numPoints, crs);
        this.source = source;

        this.baseurl = this.source.baseurl;
        const hierarchyStepSize = this.source.hierarchyStepSize;
        if (depth >= hierarchyStepSize) {
            this.baseurl = `${this.baseurl}/${hierarchyKey.substring(1, hierarchyStepSize + 1)}`;
        }

        this.hierarchyKey = hierarchyKey;
        this.hierarchy = hierarchy;

        this.childrenBitField = this.hierarchy[this.hierarchyKey]?.childrenBitField ?? 255;
    }

    override get url(): string {
        return `${this.baseurl}/${this.hierarchyKey}.bin`;
    }

    override get networkOptions(): RequestInit {
        return this.source.networkOptions;
    }

    async loadHierarchy(): Promise<Record<string, PotreeNodeInfo>> {
        if (this.hierarchyIsLoaded) {
            return this.hierarchy;
        }
        const hierarchyUrl = `${this.baseurl}/${this.hierarchyKey}.${this.source.extensionOctree}`;
        const buffer = await this.fetcher(hierarchyUrl);
        const view = new DataView(buffer);

        // update current node from the newly fetched hierarchy buffer
        this.childrenBitField = view.getUint8(0);
        this.numPoints = view.getUint32(1, true);

        // parse and create Hierarchy
        const stack = [];
        stack.push(this.hierarchyKey);

        const hierarchy: Record<string, PotreeNodeInfo> = {};

        let offset = 0;
        const byteLength = view.byteLength;
        while (stack.length && offset < byteLength) {
            const hierarchyKey = stack.shift() as string;
            let childrenBitField = view.getUint8(offset);
            let numPoints = view.getUint32(offset + 1, true);

            // In potree 1.7 there is a bug with the numPoints
            // (set to 0 even if there is point in the associated bin)
            // of the last level when we reach source.hierarchyStepSize.
            // It can be the last level of the hierarchy, or in the
            // sub-hierarchy if there is children or grand-children (and
            // only these will be impacted)

            if (hierarchyKey.length - this.hierarchyKey.length === this.source.hierarchyStepSize) {
                numPoints = -1;// to load the subHierarchy when needed
                childrenBitField = childrenBitField || 255; // for bug v1.7
            }

            if (hierarchyKey.length > this.source.hierarchyStepSize) {
                // for bug v1.7
                numPoints = numPoints || 9999;
            }

            hierarchy[hierarchyKey] = {
                childrenBitField,
                numPoints,
            };

            // look up 8 children
            for (let childIndex = 0; childIndex < 8; childIndex++) {
                // does snode have a #childIndex child ?
                if (childrenBitField & (1 << childIndex)) {
                    stack.push(`${hierarchyKey}${childIndex}`);
                }
            }
            offset += 5;
        }
        this.hierarchy = hierarchy;
        return hierarchy;
    }

    override async createChildren(): Promise<void> {
        await this.loadHierarchy();

        const childMask = this.hierarchy[this.hierarchyKey].childrenBitField;

        for (let childIndex = 0; childIndex < 8; childIndex++) {
            const childExists = ((1 << childIndex) & childMask) !== 0;

            if (!childExists) {
                continue;
            }

            const childHierarchyKey = `${this.hierarchyKey}${childIndex}`;

            const child = new PotreeNode(
                childHierarchyKey,
                this.source,
                this.crs,
                this.hierarchy,
            );

            this.add(child as this);
        }
    }
}

export default PotreeNode;
