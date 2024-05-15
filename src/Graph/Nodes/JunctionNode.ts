import { Dependency, DumpDotNodeStyle, Type, getColor } from '../Common.ts';
import GraphNode from './GraphNode.ts';

export default class JunctionNode extends GraphNode {
    private static inputName = 'value';

    public constructor(input: GraphNode | Type) {
        if (input instanceof GraphNode) {
            super(new Map([[JunctionNode.inputName, [input, input.outputType]]]), input.outputType);
        } else {
            super(new Map([[JunctionNode.inputName, [undefined, input]]]), input);
        }
    }

    protected _apply(frame: number): any {
        const node = this.inputs.entries().next().value[1][0] as Dependency;
        return node?.getOutput(frame) ?? null;
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

        return `[${attrs}]`;
    }
}
