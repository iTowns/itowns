import { Dependency, DumpDotNodeStyle, Graph, Type, getColor } from '../Common.ts';
import GraphNode from './GraphNode.ts';

export default class JunctionNode extends GraphNode {
    protected static inputName = 'value';

    /**
     * @argument input The name of the input node in its graph and itself or the expected type.
     */
    public constructor(input: GraphNode | Type) {
        if (typeof input != 'string') {
            super(new Map([[JunctionNode.inputName, [input, input.outputType]]]), input.outputType);
        } else {
            super(new Map([[JunctionNode.inputName, [undefined, input]]]), input);
        }
    }

    protected _apply(graph: Graph, frame: number): any {
        return this.inputs.get(JunctionNode.inputName)![0]?.getOutput(graph, frame) ?? null;
    }

    public get input(): [Dependency, Type] {
        return this.inputs.get(JunctionNode.inputName)!;
    }

    public set input(node: Dependency) {
        const [_oldValue, type] = this.inputs.get(JunctionNode.inputName)!;
        this.inputs.set(JunctionNode.inputName, [node, type]);
    }

    protected get _nodeType(): string {
        const name = JunctionNode.name;
        return name.slice(0, name.length - 4);
    }

    public get dumpDotStyle(): DumpDotNodeStyle {
        return {
            label: name => `${name}`,
            attrs: {
                shape: 'insulator',
                ...getColor(null, this.outputType),
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

    public dumpDotEdgeAttr(extra?: { [attr: string]: string; } | undefined): string {
        const attrs = Object.entries(extra ?? {})
            .map(([name, value]) => `${name}="${value}"`)
            .join(' ');

        const input = this.inputs.get(JunctionNode.inputName)![0];
        if (input != undefined) {
            return input.dumpDotEdgeAttr(extra);
        }

        return `[${attrs}]`;
    }
}
