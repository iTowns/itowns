const ts = require('typescript');

// Type of a TS type node, as understood by the JSDoc type parser.
function typeText(node) {
    if (!node) { return '*'; }
    // Documented through dotted @param tags
    if (ts.isTypeLiteralNode(node)) { return 'Object'; }
    // TS-only syntax would break the JSDoc type syntax
    if (/[{}]|=>|import\(|\b(?:keyof|typeof|extends|infer)\b/.test(node.getText())) { return '*'; }
    return node.getText().replace(/\s+/g, ' ');
}

// Type checker of the file being processed, used to infer the types that are not written.
let checker = null;

function inferred(type) {
    if (!checker || !type) { return '*'; }
    const str = checker.typeToString(type);
    return /^[\w$.<>[\], |]+$/.test(str) && !/\b(?:any|unknown|error)\b/.test(str) ? str : '*';
}

// Type of an untyped parameter, inferred from its literal default value.
function initializerType(init, node) {
    if (!init) { return '*'; }
    if (ts.isNumericLiteral(init) || (ts.isPrefixUnaryExpression(init) && ts.isNumericLiteral(init.operand))) {
        return 'number';
    }
    if (ts.isStringLiteralLike(init)) { return 'string'; }
    if (ts.isNewExpression(init) && /^[\w$.]+$/.test(init.expression.getText())) { return init.expression.getText(); }
    if (init.kind === ts.SyntaxKind.TrueKeyword || init.kind === ts.SyntaxKind.FalseKeyword) { return 'boolean'; }
    return inferred(node && checker.getTypeAtLocation(node));
}

// Return type of a function: written, else the union of its overloads' ones, else inferred.
function returnType(fn) {
    if (fn.type) { return typeText(fn.type); }
    const overloads = fn.name && fn.parent && fn.parent.statements
        ? fn.parent.statements.filter(n => ts.isFunctionDeclaration(n) && !n.body &&
            n.name && n.name.getText() === fn.name.getText() && n.type)
        : [];
    if (overloads.length) {
        const types = [...new Set(overloads.map(n => typeText(n.type)))];
        return types.includes('*') ? '*' : types.join('|');
    }
    return inferred(checker.getReturnTypeOfSignature(checker.getSignatureFromDeclaration(fn)));
}

// Registers `name` (and, for object types, `name.member`) with its type and optionality.
function collect(map, name, typeNode, initializer, optional, node) {
    map.set(name, {
        type: typeNode ? typeText(typeNode) : initializerType(initializer, node),
        optional: optional || !!initializer,
    });
    if (typeNode && ts.isTypeLiteralNode(typeNode)) {
        typeNode.members.filter(ts.isPropertySignature).forEach((m) => {
            collect(map, `${name}.${m.name.getText()}`, m.type, null, !!m.questionToken, m);
        });
    }
}

// Adds `{type}` and optionality to the TSDoc @param / @returns tags of the JSDoc comments.
function addTypes(source) {
    const options = { noResolve: true, noLib: true, target: ts.ScriptTarget.ESNext, noEmit: true };
    const host = ts.createCompilerHost(options);
    const sf = ts.createSourceFile('f.ts', source, ts.ScriptTarget.ESNext, true);
    host.getSourceFile = name => (name === 'f.ts' ? sf : undefined);
    checker = ts.createProgram(['f.ts'], options, host).getTypeChecker();
    const edits = [];

    const typeComment = (node, params, returns) => {
        const ranges = ts.getLeadingCommentRanges(source, node.getFullStart()) || [];
        const range = ranges.filter(r => source.slice(r.pos, r.pos + 3) === '/**').pop();
        if (!range) { return; }
        const text = source.slice(range.pos, range.end);
        const out = text
            .replace(/^(\s*\* @param) (?!\{)\[?([\w$.]+)\]?/gm, (m, tag, name) => {
                const p = params.get(name);
                return p ? `${tag} {${p.type}} ${p.optional ? `[${name}]` : name}` : m;
            })
            .replace(/^(\s*\* @returns?) (?!\{)(?=\S)/gm, (m, tag) => (returns ? `${tag} {${returns}} ` : m));
        if (out !== text) { edits.push({ pos: range.pos, end: range.end, out }); }
    };

    const visit = (node) => {
        let fn = null;
        if (ts.isClassDeclaration(node)) {
            fn = node.members.find(ts.isConstructorDeclaration);
        } else if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) ||
            ts.isConstructorDeclaration(node)) {
            fn = node;
        }
        if (fn) {
            const params = new Map();
            fn.parameters.forEach((p) => {
                collect(params, p.name.getText(), p.type, p.initializer, !!p.questionToken, p);
            });
            typeComment(node, params, ts.isClassDeclaration(node) ? null : returnType(fn));
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);

    return edits.sort((a, b) => b.pos - a.pos)
        .reduce((src, ed) => src.slice(0, ed.pos) + ed.out + src.slice(ed.end), source);
}

// TSDoc examples are `@example Title` followed by a markdown code fence, whereas the
// template expects a `<caption>` and plain code.
function convertExamples(source) {
    return source.replace(/\/\*\*[\s\S]*?\*\//g, (comment) => {
        const lines = comment.split('\n');
        const out = [];
        let inExample = false;
        lines.forEach((line) => {
            const tag = line.match(/^(\s*\*\s*)@(\w+)(.*)$/);
            if (tag && tag[2] === 'example') {
                inExample = true;
                out.push(`${tag[1]}@example`);
                if (tag[3].trim()) { out.push(`${tag[1]}<caption>${tag[3].trim()}</caption>`); }
            } else if (tag) {
                inExample = false;
                out.push(line);
            } else if (inExample && /^\s*\*\s*```/.test(line)) {
                // drop the markdown fences
            } else {
                out.push(line);
            }
        });
        return out.join('\n');
    });
}

// JSDoc can only parse JavaScript: strip the types from .ts sources (comments are kept).
exports.handlers = {
    beforeParse(e) {
        if (!/\.ts$/.test(e.filename)) {
            return;
        }
        e.source = ts.transpileModule(convertExamples(addTypes(e.source)), {
            compilerOptions: {
                target: ts.ScriptTarget.ESNext,
                module: ts.ModuleKind.ESNext,
                removeComments: false,
                useDefineForClassFields: false,
            },
        }).outputText
            // JSDoc cannot serialize BigInt literals
            .replace(/\b(\d+)n\b/g, '$1')
            // TSDoc tags carry no types: JSDoc templates need one
            .replace(/^(\s*\* @(?:param|property|prop)) (?!\{)/gm, '$1 {*} ')
            .replace(/^(\s*\* @returns?) (?!\{)(?=\S)/gm, '$1 {*} ')
            .replace(/^\s*\* @returns?\s*$/gm, '');
    },
};
