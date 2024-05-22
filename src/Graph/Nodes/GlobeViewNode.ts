import { Extent, GlobeView } from 'Main.js';
import { BuiltinType, Dependency, DumpDotNodeStyle, ViewNode } from '../Common.ts';

export default class GlobeViewNode extends ViewNode {
    public constructor(viewerDiv: Dependency, placement: Dependency) {
        super(
            viewerDiv,
            (_frame, args) => {
                if (args.viewerDiv == undefined || args.placement == undefined) {
                    throw new Error('Missing view dependencies');
                }

                return new GlobeView(args.viewerDiv as HTMLDivElement, args.placement as Extent);
            },
            { placement: [placement, BuiltinType.Placement] },
        );
    }

    public get nodeType(): string {
        return GlobeViewNode.name.replace('Node', '');
    }

    public get dumpDotStyle(): DumpDotNodeStyle {
        return {
            label: name => name,
            attrs: {
                color: 'cornflowerblue',
            },
        };
    }
}
