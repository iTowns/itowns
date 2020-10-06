export const deprecatedParsingOptionsToNewOne = (options) => {
    /* istanbul ignore next */
    if (options.crsOut || options.crsIn) {
        console.warn('Parsing options with crsIn and crsOut are deprecates, use { in, out } structure.');
        const newOptions = { in: {}, out: {} };
        newOptions.in.crs = options.crsIn;
        newOptions.in.isInverted = options.isInverted;
        newOptions.in.styles = options.styles;
        newOptions.in.layers = options.layers;
        newOptions.in.filter = options.filter;

        newOptions.out.crs = options.crsOut;
        newOptions.out.mergeFeatures = options.mergeFeatures;
        newOptions.out.withNormal = options.withNormal;
        newOptions.out.withAltitude = options.withAltitude;
        newOptions.out.buildExtent = options.buildExtent;
        newOptions.out.filteringExtent = options.filteringExtent;
        newOptions.out.style = options.style;
        newOptions.out.overrideAltitudeInToZero = options.overrideAltitudeInToZero;
        newOptions.out.filter = options.filter;
        return newOptions;
    } else {
        return options;
    }
};

export default {};


