import { Extent, PlanarView } from '../../Main';
import { BuiltinType, Dependency, DumpDotNodeStyle, ViewNode } from '../Prelude';

export default class PlanarViewNode extends ViewNode {
    public constructor(viewerDiv: Dependency, placement: Dependency) {
        super(
            viewerDiv,
            (_frame, args) => {
                if (args.viewerDiv == undefined || args.placement == undefined) {
                    throw new Error('Missing view dependencies');
                }

                const view = new PlanarView(args.viewerDiv as HTMLDivElement, args.placement as Extent);
                this.updateOutputs({
                    view,
                    renderer: view.mainLoop.gfxEngine.renderer,
                    camera: view.camera,
                });
            },
            { placement: [placement, BuiltinType.Placement] },
        );
    }

    public override get nodeType(): string {
        return PlanarViewNode.name;
    }

    public override get dumpDotStyle(): DumpDotNodeStyle {
        return {
            label: name => name,
            attrs: {
                color: 'cornflowerblue',
            },
        };
    }
}
