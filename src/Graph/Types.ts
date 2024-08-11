// Stored in a separate file to avoid circular dependencies

import { OrthographicCamera, PerspectiveCamera } from 'three';
import { Extent } from 'Main';
import Graph from './Graph';
import GraphNode from './Nodes/GraphNode';

export type Type = string;
export type Dependency = {
    node: GraphNode,
    output: string
};
export type Dependant = {
    node: GraphNode,
    input: string,
};

// TODO: Refactor type enum variants into separate types and discriminated union types
// can still have a `Custom<string>`-like variant

export enum KernelType {
    Gaussian = 'Gaussian',
    Box = 'Box',
    /** Eye-Dome Lighting, intended for SSAO effects */
    EDL = 'EDL',
}

export enum BuiltinType {
    Any = 'Any',

    // Primitives
    Number = 'Number',
    String = 'String',
    Float32Array = 'Float32Array',

    // iTowns types
    Source = 'Source',
    View = 'View',
    Placement = 'Placement',
    CRS = 'CRS',

    // Three.js
    /// Types
    Renderer = 'Renderer',
    RenderTarget = 'RenderTarget',
    Texture = 'Texture',
    Camera = 'Camera',
    CameraData = 'CameraData',
    /// Primitives
    Vector2 = 'Vector2',
    Vector3 = 'Vector3',
    Vector4 = 'Vector4',

    // Variants
    KernelType = 'KernelType',

    // DOM
    HtmlDivElement = 'HtmlDivElement',
}

export type CameraLike = OrthographicCamera | PerspectiveCamera;

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

export interface Source<Input, Output> {
    loadData(extent: Extent, input: Input): Promise<Output>;
}
