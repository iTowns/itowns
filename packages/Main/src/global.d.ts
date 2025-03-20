// Consider all `import '*.glsl'` as imports of modules with a default string
// export. This is coherent with the behavior of the babel compiler.
declare module '*.glsl' {
    const glsl: string;
    export default glsl;
}

// Declare the external global variable __DEBUG__. This is replaced by either
// true or false during the compilation step.
declare const __DEBUG__: boolean;
