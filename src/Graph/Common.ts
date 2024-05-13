import Graph from './Graph.ts';
import GraphNode from './Nodes/GraphNode.ts';
import InputNode from './Nodes/InputNode.ts';
import ProcessorNode from './Nodes/ProcessorNode.ts';
import ScreenShaderNode from './Nodes/ScreenShaderNode.ts';
import RenderViewNode from './Nodes/RenderViewNode.ts';

enum BuiltinType {
    Number = 'Number',
    GeoData = 'GeoData', // TODO: split into different data formats
    Renderer = 'Renderer',
    RenderTarget = 'RenderTarget',
    View = 'View',
    Texture = 'Texture',
    Vector2 = 'Vector2',
    CRS = 'CRS', // Coordinate Reference System
}

export type Type = string;
export type Dependency = GraphNode | undefined | null;

export interface DumpDotNodeStyle {
    label: (name: string) => string;
    attrs: { [key: string]: string };
}

export interface DumpDotGlobalStyle {
    rankdir: string;
    node: { [key: string]: string };
    edge: { [key: string]: string };
}

export {
    // Classes
    Graph,
    GraphNode,
    InputNode,
    ProcessorNode,
    ScreenShaderNode,
    RenderViewNode,

    // Utils
    BuiltinType,
};
