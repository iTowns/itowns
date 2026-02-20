import PotreeNodeBase from 'Core/PotreeNodeBase';
import type PotreeSource from 'Source/PotreeSource';

type NodeInfo = {
    hierarchyKey: string,
    childrenBitField: number, // 0 <= integer <= 255
    numPoints: number, // integer >= 0
}

class PotreeNode extends PotreeNodeBase {
    source: PotreeSource;

    hierarchy: Record<string, NodeInfo>;

    private _baseurl: string | undefined;

    constructor(
        depth: number,
        index: number,
        numPoints: number,
        childrenBitField: number,
        source: PotreeSource,
        crs: string,
    ) {
        super(depth, index, numPoints, childrenBitField, source, crs);
        this.source = source;

        this.hierarchy = {};
    }

    override get baseurl(): string {
        if (this._baseurl != undefined) { return this._baseurl; }
        if (this.depth === 0) {
            this._baseurl = this.source.baseurl;
            return this._baseurl;
        }
        const parent = this.parent as this;
        if ((this.depth % this.source.hierarchyStepSize) == 0) {
            this._baseurl = `${parent.baseurl}/${this.hierarchyKey.substring(1)}`;
        } else {
            this._baseurl = parent.baseurl;
        }
        return this._baseurl;
    }

    override get url(): string {
        return `${this.baseurl}/${this.hierarchyKey}.bin`;
    }

    override get networkOptions(): RequestInit {
        return this.source.networkOptions;
    }

    async loadHierarchy(): Promise<Record<string, NodeInfo>> {
        if (this.hierarchyIsLoaded) {
            return this.hierarchy;
        }
        console.log('loadHierarchy', this.id);
        const octreeUrl = `${this.baseurl}/${this.hierarchyKey}.${this.source.extensionOctree}`;
        const buffer = await this.fetcher(octreeUrl);
        const view = new DataView(buffer);

        // parseHierarchy
        this.childrenBitField = view.getUint8(0);
        this.numPoints = view.getUint32(1, true);

        const stack: NodeInfo[] = [];
        const root = {
            hierarchyKey: 'r',
            childrenBitField: this.childrenBitField,
            numPoints: this.numPoints,
        };
        stack.push(root);
        const byteLength = view.byteLength;

        const hierarchy: Record<string, NodeInfo> = {
            r: { ...root },
        };

        let offset = 5;

        while (stack.length && offset < byteLength) {
            const snode = stack.shift() as NodeInfo;
            // look up 8 children
            for (let childIndex = 0; childIndex < 8; childIndex++) {
                // does snode have a #childIndex child ?
                if ((snode.childrenBitField as number) &
                        (1 << childIndex) && (offset + 5) <= byteLength) {
                    const child: NodeInfo = {
                        hierarchyKey: `${snode.hierarchyKey}${childIndex}`,
                        childrenBitField: view.getUint8(offset),
                        numPoints: view.getUint32(offset + 1, true),
                    };

                    stack.push(child);
                    hierarchy[child.hierarchyKey] = { ...child };
                    offset += 5;
                }
            }
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

            const childrenBitField = this.hierarchy[childHierarchyKey].childrenBitField;
            const numPoints = this.hierarchy[childHierarchyKey].numPoints;

            const child = new PotreeNode(
                this.depth + 1, childIndex,
                numPoints, childrenBitField,
                this.source, this.crs);

            this.add(child as this, childIndex);
            child.hierarchy = this.hierarchy;
        }
    }
}

export default PotreeNode;
