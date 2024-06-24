import * as THREE from 'three';
import { Vector2 } from 'three';
import { BuiltinType, Dependency, DumpDotNodeStyle, GraphNode, Type, Mappings, ProcessorNode } from '../Prelude';
import { CameraLike } from '../Types';

type CallbackArgs = {
    target: THREE.WebGLRenderTarget;
    renderer: THREE.WebGLRenderer;
} & { [name: string]: any };

type FragmentShaderParts = {
    includes?: string[],
    defines?: { [name: string]: number | string },
    uniforms?: { [name: string]: Dependency | GraphNode | Type };
    auxCode?: string;
    main: string;
};

/**
 * Applies a shader to a render target.
 * Some default bindings are provided (without need to redefine them in your shader):
 *  - `vUv`............(varying vec2): The UV coordinates of the current fragment in the input texture.
 *  - `tDiffuse`..(uniform sampler2D): The color texture of the render target.
 *
 * Other uniforms are available but need to be explicitly declared in your code:
 *  - `tDepth`............(sampler2D): The depth texture of the render target.
 *  - `resolution`.............(vec2): The width and height of the render target.
 *  - `cameraNear`............(float): The near plane of the camera.
 *  - `cameraFar`.............(float): The far plane of the camera.
 */
export default class ScreenShaderNode extends ProcessorNode {
    protected static get vertexShader(): string {
        return /* glsl */`
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}
`;
    }

    protected static get defaultFragmentShader(): FragmentShaderParts {
        return {
            main: /* glsl */'return tex;',
        };
    }

    // HACK: Essentially a scuffed singleton pack.
    // PERF: Evaluate the cost of having a scene per shader node instead.
    protected static _scene: THREE.Scene;
    protected static _quad: THREE.Mesh;
    protected static _camera: CameraLike;

    // Kept for debug purposes
    public material: THREE.ShaderMaterial;

    protected _fragmentShaderParts: FragmentShaderParts;

    private static _init(): void {
        if (ScreenShaderNode._scene == undefined) {
            ScreenShaderNode._scene = new THREE.Scene();

            // Setup the quad used to render the effects
            ScreenShaderNode._quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
            ScreenShaderNode._quad.frustumCulled = false;

            ScreenShaderNode._scene.add(ScreenShaderNode._quad);

            ScreenShaderNode._camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        }
    }

    public constructor(
        target: Dependency,
        renderer: Dependency,
        { fragmentShaderParts = ScreenShaderNode.defaultFragmentShader, toScreen = false }: {
            fragmentShaderParts?: FragmentShaderParts,
            toScreen?: boolean
        },
    ) {
        ScreenShaderNode._init();

        const uniforms = fragmentShaderParts.uniforms ?? {};

        const fullUniforms = Object.fromEntries(
            Object.entries(uniforms)
                .map(([name, uniform]): [string, [Dependency | null, Type]] => {
                    let val: [Dependency | null, Type];
                    if (typeof uniform == 'string') {
                        val = [null, uniform];
                    } else if (uniform instanceof GraphNode) {
                        val = [{ node: uniform, output: GraphNode.defaultIoName }, uniform.outputs.get(GraphNode.defaultIoName)!.type];
                    } else {
                        val = [uniform, uniform.node.outputs.get(uniform.output)!.type];
                    }

                    return [name, val];
                }),
        );

        super(
            {
                // Unpacking the uniforms object first allows us to ignore
                // potential 'target' and 'renderer' fields.
                ...fullUniforms,
                target: [target, BuiltinType.RenderTarget],
                renderer: [renderer, BuiltinType.Renderer],
            },
            BuiltinType.RenderTarget,
            (_frame, args) => {
                const { target: input, renderer, ...rest } = args as CallbackArgs;

                const camera = ScreenShaderNode._camera;

                const uniforms = {
                    tDiffuse: input.texture,
                    tDepth: input.depthTexture,
                    resolution: new Vector2(input.width, input.height),
                    cameraNear: camera.near,
                    cameraFar: camera.far,
                    ...rest,
                };

                // Set uniforms
                for (const [name, value] of Object.entries(uniforms ?? {})) {
                    this.material.uniforms[name] = { value };
                }

                ScreenShaderNode._quad.material = this.material;

                const target: THREE.WebGLRenderTarget | null = toScreen
                    ? null
                    : ((this.outputs.get(GraphNode.defaultIoName)!.value as THREE.WebGLRenderTarget | null) ?? createRenderTarget(input));

                renderer.setRenderTarget(target);
                renderer.clear();
                renderer.render(ScreenShaderNode._scene, ScreenShaderNode._camera);

                this.updateOutputs({ [ScreenShaderNode.defaultIoName]: target });
            });

        this._fragmentShaderParts = fragmentShaderParts;
        const frag = ScreenShaderNode.buildFragmentShader(this._fragmentShaderParts);
        this.material = ScreenShaderNode.buildMaterial(frag);
    }

    public get fragmentShaderParts(): FragmentShaderParts {
        return this._fragmentShaderParts;
    }

    // TODO: group this and similar operations in their own class
    public static buildFragmentShader({ includes, defines, uniforms, auxCode, main }: FragmentShaderParts): string {
        const uniformDeclarations = Object.entries(uniforms ?? {})
            .map(([name, uniform]): string => {
                let ty: Type;

                if (typeof uniform == 'string') {
                    ty = uniform;
                } else if (uniform instanceof GraphNode) {
                    ty = uniform.outputs.get(GraphNode.defaultIoName)!.type;
                } else {
                    ty = uniform.node.outputs.get(uniform.output)!.type;
                }

                // TODO: Create a way to mark types as non-automatic uniforms
                // Maybe completely remove automatic uniform creation and leave it up to the user
                if (ty == BuiltinType.Float32Array) {
                    return '';
                }

                return `uniform ${Mappings.toOpenGL(ty)} ${name};`;
            })
            .filter(s => s.length > 0);

        return [
            // highp by default for simplicity, will change if complaints arise
            'precision highp float;\n',
            // Pre-processor statements
            ...includes?.map(inc => `#include <${inc}>`) ?? [],
            '',
            ...Object.entries(defines ?? {}).map(([name, value]) => `#define ${name} ${value}`),
            '',
            // UVs
            'varying vec2 vUv;',
            // Uniforms
            'uniform sampler2D tDiffuse;',
            ...(uniformDeclarations.length > 0 ? [uniformDeclarations.join('\n')] : []),
            // User code
            ...(auxCode != undefined ? [auxCode] : []),
            'vec4 shader(in vec4 tex) {',
            ...main.split('\n').map(s => `    ${s}`),
            '}',
            '',
            'void main() {',
            '    gl_FragColor = shader(texture2D(tDiffuse, vUv));',
            '}',
        ].join('\n');
    }

    public static buildMaterial(fragmentShader: string): THREE.ShaderMaterial {
        return new THREE.ShaderMaterial({
            fragmentShader,
            vertexShader: ScreenShaderNode.vertexShader,
        });
    }

    public override get nodeType(): string {
        return ScreenShaderNode.name;
    }

    public override get dumpDotStyle(): DumpDotNodeStyle {
        const { label, attrs } = super.dumpDotStyle;
        return {
            label,
            attrs,
        };
    }
}

function createRenderTarget(input: THREE.WebGLRenderTarget<THREE.Texture>): THREE.WebGLRenderTarget<THREE.Texture> | null {
    const target = new THREE.WebGLRenderTarget(input.width, input.height);
    target.depthBuffer = true;
    target.depthTexture = new THREE.DepthTexture(input.width, input.height);
    target.depthTexture.type = THREE.UnsignedShortType;
    return target;
}

