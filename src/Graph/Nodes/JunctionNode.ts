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
            const ty = nodeOutput.type;

            super(new Map([[GraphNode.defaultIoName, [input, ty]]]), ty);
        } else {
            super(new Map([[GraphNode.defaultIoName, [null, input]]]), input);
        }
    }

    protected override _apply(graph?: Graph, frame: number = 0): void {
        const dep = this.inputs.get(GraphNode.defaultIoName)![0];

        if (dep == null) {
            this.updateOutputs({ [GraphNode.defaultIoName]: null }, frame);
            return;
        }

        const { node, output } = dep;
        this.updateOutputs({ [GraphNode.defaultIoName]: node.getOutput(output, graph, frame) ?? null }, frame);
    }

    public get input(): [Dependency | null, Type] {
        return this.inputs.get(GraphNode.defaultIoName)!;
    }

    public set input(node: Dependency) {
        this.updateInputs({ [GraphNode.defaultIoName]: node });
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
                ...Mappings.colorize(null, this.outputs.get(GraphNode.defaultIoName)!.type),
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
