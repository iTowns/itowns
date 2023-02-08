module.exports = [
    {
        constructor: RegExp,
        code: 0,
        args: item => [item.source, item.flags],
        build(source, flags) {
            return new RegExp(source, flags);
        },
    },
    {
        constructor: Date,
        code: 1,
        args: item => [item.valueOf()],
        build(value) {
            return new Date(value);
        },
    },
];
