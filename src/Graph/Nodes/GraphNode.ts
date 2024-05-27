import { Type, Dependency, DumpDotNodeStyle, Graph } from '../Common.ts';

/**
 * Represents a node in a directed graph.
 * Base class for all other types of nodes.
 */
export default abstract class GraphNode {
    protected static defaultIOName = 'value';
    // protected _out: [number, any | undefined];
    protected _out: {
        frame: number,
        outputs: Map<string, [any, Type]>,
    };

    public inputs: Map<string, [Dependency | null, Type]>;

    public constructor(
        inputs: Map<string, [Dependency | GraphNode | null, Type]>,
        // Optional to allow for clean side-effect-only nodes
        outputs?: Map<string, Type> | Type,
    ) {
        this.inputs = new Map(Array.from(inputs.entries())
            .map(([name, [dep, ty]]) => [
                name,
                [
                    dep instanceof GraphNode
                        ? { node: dep, output: GraphNode.defaultIOName }
                        : dep,
                    ty,
                ],
            ]));

        let normalizedOutputs = null;

        if (outputs == undefined) {
            normalizedOutputs = new Map();
        } else if (outputs instanceof Map) {
            normalizedOutputs = new Map(Array.from(outputs.entries()).map(([name, ty]) => [name, [undefined, ty]]));
        } else {
            normalizedOutputs = new Map([[GraphNode.defaultIOName, [undefined, outputs]]]);
        }

        this._out = { frame: -1, outputs: normalizedOutputs };
    }

    protected abstract _apply(graph?: Graph, frame?: number): any;

    public abstract get nodeType(): string;

    public get outputs(): Map<string, [any, Type]> {
        return this._out.outputs;
    }

    /**
     * Get the output of the node at a given frame.
     * @param graph The graph the node is a part of.
     * @param frame The frame to get the output for.
     * @returns The output of the node at the given frame.
     */
    public getOutput(name: string = GraphNode.defaultIOName, graph?: Graph, frame: number = 0): [any, Type] {
        const { frame: oFrane, outputs } = this._out;

        if (!outputs.has(name)) {
            throw new Error(`Provided ${this.nodeType} node does not have an output named '${name}'`);
        }

        const [oValue, oType] = outputs.get(name)!;

        if (oValue == undefined || oFrane !== frame) {
            this._out.frame = frame;
            const res = this._apply(graph, frame);
            this._out.outputs.set(name, [res, oType]);
        }

        return this._out.outputs.get(name)![0];
    }

    /**
     * Get the style for the node when dumping to DOT format.
     */
    public abstract get dumpDotStyle(): DumpDotNodeStyle;

    /**
     * Get the DOT attribute string for the node.
     * @param name The name of the node.
     */
    public dumpDot(name: string): string {
        const { label, attrs } = this.dumpDotStyle;
        const formattedAttrs = Object.entries(attrs)
            .map(([k, v]) => `${k} = ${v}`)
            .join(' ');

        const lType = `<tr><td><b>${this.nodeType}</b></td></tr>`;

        const lName = label(name).trim();
        const lNameFormatted = lName.length == 0 ? [] : [`<hr/><tr><td><i>${lName}</i></td></tr>`];

        const lPorts = Array.from(this.inputs)
            .map(([name, [dep, _ty]]) =>
                `<tr><td align="left" port="${name}" ${dep == undefined ? 'color:"red"' : ''}>${name}</td></tr>`);
        const lOutputs = Array.from(this.outputs)
            .map(([name, _dep]) =>
                `<tr><td align="right" port="${name}">${name}</td></tr>`,
            );

        const lHtml = ['<<table border="0">', lType, ...lNameFormatted, ...lPorts, ...lOutputs, '</table>>'].join('\n');

        return `"${name}" [label=${lHtml} ${formattedAttrs} margin=.05]`;
    }

    /**
     * Get the DOT attribute string for the outgoing edges.
     *
     * Example expected output: [label=" Renderer"]
     */
    public dumpDotEdgeAttr(ty: Type, extra?: { [attr: string]: string }): string {
        const attrs = Object.entries(extra ?? {})
            .map(([name, value]) => `${name}="${value}"`)
            .join(' ');

        return `[label=" ${ty}" ${attrs}]`;
    }
}
