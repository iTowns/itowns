import { BuiltinType, Dependency, DumpDotNodeStyle, Type } from '../Prelude';
import ProcessorNode from './ProcessorNode';

export default class FieldGetterNode extends ProcessorNode {
    public constructor(input: Dependency, path: string, outputType: Type) {
        super(
            { input: [input, BuiltinType.Any] },
            outputType,
            (_frame, args) =>
                path.split('.').reduce((acc: any, pathSegment) => acc[pathSegment], args.input),
        );
    }

    public override get nodeType(): string {
        return FieldGetterNode.name;
    }

    public override get dumpDotStyle(): DumpDotNodeStyle {
        const { label: _, attrs } = super.dumpDotStyle;
        return {
            label: name => name,
            attrs,
        };
    }
}
