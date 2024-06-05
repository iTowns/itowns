// Stored in a separate file to avoid circular dependencies

import Graph from './Graph.ts';
import GraphNode from './Nodes/GraphNode.ts';

export type Type = string;
export type Dependency = {
    node: GraphNode,
    output: string
};

export enum BuiltinType {
    Any = 'Any',

    // Primitives
    Number = 'Number',

    // iTowns types
    View = 'View',
    Placement = 'Placement',

    // Three.js
    /// Types
    Renderer = 'Renderer',
    RenderTarget = 'RenderTarget',
    /// Primitives
    Vector2 = 'Vector2',
    Vector3 = 'Vector3',
    Vector4 = 'Vector4',

    // DOM
    HtmlDivElement = 'HtmlDivElement',
}

export type ColorStyle = {
    color?: string,
    fillcolor?: string,
};

export interface DumpDotNodeStyle {
    label: (name: string) => string;
    attrs: { [key: string]: string | { [key: string]: string } };
}

export interface DumpDotGlobalStyle {
    rankdir: string;
    node: { [key: string]: string };
    edge: { [key: string]: string };
}

export type GraphOptimization = {
    pattern: string[],
    operation: (nodes: GraphNode[], graph: Graph) => GraphNode
};
