import { colorLayerEffects } from 'Renderer/LayeredMaterial';

export const deprecatedColorLayerOptions = (options) => {
    if (options.fx) {
        console.warn('ColorLayer fx is deprecated, use ColorLayer.effect_type and ColorLayer.effect_parameter instead.');
        if (options.fx > 2.0) {
            options.effect_parameter = options.fx;
            options.effect_type = colorLayerEffects.removeLightColor;
        } else if (options.fx > 0.0) {
            options.effect_parameter = options.fx;
            options.effect_type = colorLayerEffects.removeWhiteColor;
        }
    }
    return options;
};

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
        if (options.out.withAltitude && options.out.withNormal) {
            newOptions.structure = '3d';
        } else {
            newOptions.structure = '2d';
        }
        newOptions.out.filteringExtent = options.filteringExtent;
        newOptions.out.style = options.style;
        newOptions.out.overrideAltitudeInToZero = options.overrideAltitudeInToZero;
        newOptions.out.filter = options.filter;
        return newOptions;
    } else if (options.out && (options.out.withAltitude !== undefined || options.out.withNormal !== undefined)) {
        console.warn('Parsing options out.withAltitude and out.withNormal are deprecates, use out.structure: 2d or 3d.');
        if (options.out.withAltitude && options.out.withNormal) {
            options.structure = '3d';
        } else {
            options.structure = '2d';
        }
    }
    return options;
};

export default {};


