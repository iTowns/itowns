import { Type, Dependency, DumpDotNodeStyle } from '../Common.ts';

/**
 * Represents a node in a directed graph.
 * Base class for all other types of nodes.
 */
export default abstract class GraphNode {
    public inputs: Map<string, [Dependency, Type]>;
    public outputType: Type;

    protected _out: [number, any | undefined];

    public constructor(inputs: Map<string, [Dependency, Type]>, outputType: Type) {
        this.inputs = inputs;
        this.outputType = outputType;
        this._out = [-1, undefined];
    }

    protected abstract _apply(_frame: number): any;

    protected abstract get _nodeType(): string;

    /**
     * Get the output of the node at a given frame.
     * @param frame The frame to get the output for.
     * @returns The output of the node at the given frame.
     */
    public getOutput(frame: number): any {
        const [oFrane, oValue] = this._out;
        if (oValue == undefined || oFrane !== frame) {
            this._out = [frame, this._apply(frame)];
        }
        return this._out[1];
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
            .map(([k, v]) => `${k}=${v}`)
            .join(' ');

        const lType = `<tr><td><b>${this._nodeType}</b></td></tr>`;

        const lName = label(name).trim();
        const lNameFormatted = lName.length == 0 ? [] : [`<hr/><tr><td><i>${lName}</i></td></tr>`];

        const lPorts = Array.from(this.inputs)
            .map(([name, [dep, _ty]]) =>
                `<tr><td align="left" port="${name}" ${dep == undefined ? 'color:"red"' : ''}>${name}</td></tr>`);

        const lHtml = ['<<table border="0">', lType, ...lNameFormatted, ...lPorts, '</table>>'].join('\n');

        return `"${name}" [label=${lHtml} ${formattedAttrs} margin=.05]`;
    }

    /**
     * Get the DOT attribute string for the outgoing edges.
     *
     * Example output: [label="Node" shape="box"]
     */
    public dumpDotEdgeAttr(extra?: { [attr: string]: string }): string {
        const attrs = Object.entries(extra ?? {})
            .map(([name, value]) => `${name}="${value}"`)
            .join(' ');

        return `[label=" ${this.outputType}" ${attrs}]`;
    }
}
