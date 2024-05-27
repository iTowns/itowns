import { Dependency, DumpDotNodeStyle, Graph, Type, getColor } from '../Common.ts';
import GraphNode from './GraphNode.ts';

export default class JunctionNode extends GraphNode {
    protected static ioName = 'value';

    /**
     * @argument input The name of the input node in its graph and itself or the expected type.
     */
    public constructor(input: Dependency | Type) {
        if (typeof input != 'string') {
            const { node, output } = input;
            const nodeOutput = node.outputs.get(output);
            if (nodeOutput == undefined) {
                throw new Error(`Provided ${node.nodeType} node does not have an output named '${output}'`);
            }
            const ty = nodeOutput[1];

            super(new Map([[JunctionNode.ioName, [input, ty]]]), ty);
        } else {
            super(new Map([[JunctionNode.ioName, [null, input]]]), input);
        }
    }

    protected _apply(graph?: Graph, frame: number = 0): any {
        const dep = this.inputs.get(JunctionNode.ioName)![0];
        if (dep == null) {
            return null;
        }

        const { node, output } = dep;
        return node.getOutput(output, graph, frame) ?? null;
    }

    public get input(): [Dependency | null, Type] {
        return this.inputs.get(JunctionNode.ioName)!;
    }

    public set input(node: Dependency) {
        const [_oldValue, type] = this.inputs.get(JunctionNode.ioName)!;
        this.inputs.set(JunctionNode.ioName, [node, type]);
    }

    public get nodeType(): string {
        return JunctionNode.name.replace('Node', '');
    }

    public get dumpDotStyle(): DumpDotNodeStyle {
        return {
            label: name => `${name}`,
            attrs: {
                shape: 'doublecircle',
                width: '.1',
                height: '.1',
                ...getColor(null, this.outputs.get(JunctionNode.ioName)![1]),
            },
        };
    }

    public dumpDot(name: string): string {
        const { label: _, attrs } = this.dumpDotStyle;
        const formattedAttrs = Object.entries(attrs)
            .map(([k, v]) => `${k}=${v}`)
            .join(' ');

        return `"${name}" [label="" ${formattedAttrs} margin=.05]`;
    }

    public dumpDotEdgeAttr(ty: Type, extra?: { [attr: string]: string; } | undefined): string {
        const attrs = Object.entries(extra ?? {})
            .map(([name, value]) => `${name}="${value}"`)
            .join(' ');

        const input = this.inputs.get(JunctionNode.ioName)![0];
        if (input != undefined) {
            return input.node.dumpDotEdgeAttr(ty, extra);
        }

        return `[${attrs}]`;
    }
}
