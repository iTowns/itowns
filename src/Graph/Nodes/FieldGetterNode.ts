import { BuiltinType, Dependency, DumpDotNodeStyle, Type } from 'Graph/Common.ts';
import ProcessorNode from './ProcessorNode.ts';

export default class FieldGetterNode extends ProcessorNode {
    public constructor(input: Dependency, path: string, outputType: Type) {
        super(
            { input: [input, BuiltinType.Any] },
            outputType,
            (_frame, args) =>
                path.split('.').reduce((acc: any, pathSegment) => acc[pathSegment], args.input),
        );
    }

    public get nodeType(): string {
        return FieldGetterNode.name.replace('Node', '');
    }

    public get dumpDotStyle(): DumpDotNodeStyle {
        const { label: _, attrs } = super.dumpDotStyle;
        return {
            label: name => name,
            attrs,
        };
    }
}
