import { Dependency, DumpDotNodeStyle, Graph, Type, Mappings } from '../Prelude';
import GraphNode from './GraphNode';

export default class JunctionNode extends GraphNode {
    public constructor(input: Dependency | Type) {
        if (typeof input != 'string') {
            const { node, output } = input;
            const nodeOutput = node.outputs.get(output);
            if (nodeOutput == undefined) {
                throw new Error(`Provided ${node.nodeType} node does not have an output named '${output}'`);
            }
            const ty = nodeOutput[1];

            super(new Map([[GraphNode.defaultIoName, [input, ty]]]), ty);
        } else {
            super(new Map([[GraphNode.defaultIoName, [null, input]]]), input);
        }
    }

    protected override _apply(graph?: Graph, frame: number = 0): void {
        const dep = this.inputs.get(GraphNode.defaultIoName)![0];
        const [_oValue, oType] = this.outputs.get(GraphNode.defaultIoName)!;

        if (dep == null) {
            this.outputs.set(GraphNode.defaultIoName, [null, oType]);
            return;
        }

        const { node, output } = dep;
        this.outputs.set(GraphNode.defaultIoName, [node.getOutput(output, graph, frame) ?? null, oType]);
    }

    public get input(): [Dependency | null, Type] {
        return this.inputs.get(GraphNode.defaultIoName)!;
    }

    public set input(node: Dependency) {
        const [_oldValue, type] = this.inputs.get(GraphNode.defaultIoName)!;
        this.inputs.set(GraphNode.defaultIoName, [node, type]);
    }

    public override get nodeType(): string {
        return JunctionNode.name;
    }

    public override get dumpDotStyle(): DumpDotNodeStyle {
        return {
            label: name => `${name}`,
            attrs: {
                shape: 'doublecircle',
                width: '.1',
                height: '.1',
                ...Mappings.colorize(null, this.outputs.get(GraphNode.defaultIoName)![1]),
            },
        };
    }

    public override dumpDot(name: string): string {
        const { label: _, attrs } = this.dumpDotStyle;
        const formattedAttrs = Object.entries(attrs)
            .map(([k, v]) => `${k}=${v}`)
            .join(' ');

        return `"${name}" [label="" ${formattedAttrs} margin=.05]`;
    }

    public override dumpDotEdgeAttr(ty: Type, extra?: { [attr: string]: string; } | undefined): string {
        const attrs = Object.entries(extra ?? {})
            .map(([name, value]) => `${name}="${value}"`)
            .join(' ');

        const input = this.inputs.get(GraphNode.defaultIoName)![0];
        if (input != undefined) {
            return input.node.dumpDotEdgeAttr(ty, extra);
        }

        return `[${attrs}]`;
    }
}
