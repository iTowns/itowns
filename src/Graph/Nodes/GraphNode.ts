import { Type, Dependency, DumpDotNodeStyle } from '../Common.ts';

/**
 * Represents a node in a directed graph.
 * Base class for all other types of nodes.
 */
export default abstract class GraphNode {
    public inputs: Map<string, Dependency>;
    public outputType: Type;

    protected _out: [number, any | undefined];

    public constructor(inputs: Map<string, Dependency>, outputType: Type) {
        this.inputs = inputs;
        this.outputType = outputType;
        this._out = [-1, undefined];
    }

    protected abstract _apply(_frame: number): any;

    protected abstract get _node_type(): string;

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
    public dumpDotAttr(name: string): string {
        const { label, attrs } = this.dumpDotStyle;
        const formattedAttrs = Object.entries(attrs)
            .map(([k, v]) => `${k}=${v}`)
            .join(' ');

        return `[label="${label(name)}" ${formattedAttrs}]`;
    }

    /**
     * Get the DOT attribute string for the edge between this node and its inputs.
     */
    public dumpDotEdgeAttr(): string {
        return `[label=" ${this.outputType}"]`;
    }
}
