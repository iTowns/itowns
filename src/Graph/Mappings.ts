import * as THREE from 'three';

import View from '../Core/View';

import { BuiltinType, Type, ColorStyle } from './Types';

export default class Mappings {
    public static typeMapping: [(v: any) => boolean, BuiltinType][] = [
        // Primitives
        [v => typeof v === 'number', BuiltinType.Number],
        // iTowns types
        [v => v instanceof View, BuiltinType.View],
        // Three.js types
        [v => v instanceof THREE.WebGLRenderer, BuiltinType.Renderer],
        [v => v instanceof THREE.WebGLRenderTarget, BuiltinType.RenderTarget],
        [v => v instanceof THREE.Vector2, BuiltinType.Vector2],
        [v => v instanceof THREE.Vector3, BuiltinType.Vector3],
        [v => v instanceof THREE.Vector4, BuiltinType.Vector4],
        // DOM
        [v => v instanceof HTMLDivElement, BuiltinType.HtmlDivElement],
    ];

    public static typeOf(value: any): BuiltinType | undefined {
        for (const [check, ty] of Mappings.typeMapping) {
            if (check(value)) {
                return ty;
            }
        }
        return undefined;
    }


    // eslint-disable-next-line no-spaced-func, func-call-spacing
    public static stringMapping = new Map<Type, (v: any) => string>([
        [BuiltinType.Vector2, v => `(${v.x}, ${v.y})`],
    ]);

    public static stringify(value: any, type?: Type): string {
        const auto: string = value.toString();
        if (!auto.startsWith('[object ')) {
            return auto;
        }

        const ty = type ?? Mappings.typeOf(value);
        if (ty != undefined) {
            return Mappings.stringMapping.get(ty)?.(value) ?? `[${ty}]`;
        }

        return '...';
    }


    public static colorMapping = new Map<Type, ColorStyle>([
        [BuiltinType.Number, { color: 'chocolate', fillcolor: 'orange' }],
        [BuiltinType.View, { color: 'cornflowerblue', fillcolor: 'deepskyblue' }],
        [BuiltinType.Placement, { color: 'cornflowerblue', fillcolor: 'deepskyblue' }],
        [BuiltinType.Vector2, { color: 'indigo', fillcolor: 'violet' }],
        [BuiltinType.Vector3, { color: 'indigo', fillcolor: 'violet' }],
        [BuiltinType.Vector4, { color: 'indigo', fillcolor: 'violet' }],
        [BuiltinType.RenderTarget, { color: 'darkolivegreen', fillcolor: 'limegreen' }],
        [BuiltinType.Renderer, { color: 'darkolivegreen', fillcolor: 'limegreen' }],
        [BuiltinType.HtmlDivElement, { color: 'indianred', fillcolor: 'lightcoral' }],
    ]);

    public static colorize(value: any, type?: Type): ColorStyle {
        const ty = type ?? Mappings.typeOf(value);
        if (ty != undefined) {
            return Mappings.colorMapping.get(ty) ?? {};
        }
        return {};
    }

    public static openGlMapping = new Map<Type, string>([
        [BuiltinType.Number, 'float'],
        [BuiltinType.Vector2, 'vec2'],
        [BuiltinType.Vector3, 'vec3'],
        [BuiltinType.Vector4, 'vec4'],
        [BuiltinType.RenderTarget, 'sampler2D'],
        [BuiltinType.Texture, 'sampler2D'],
    ]);

    public static toOpenGL(type: Type): string {
        const glTy = Mappings.openGlMapping.get(type);
        if (glTy == undefined) {
            throw new Error(`Type ${type} does not have a known OpenGL equivalent`);
        }
        return glTy;
    }
}
