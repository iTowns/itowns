import type { FeatureBuildingOptions } from 'Core/Feature';
import type Layer from 'Layer/Layer';
import type Source from 'Source/Source';

/**
 * Options passed to a parser (e.g. {@link GeoJsonParser.parse}).
 *
 * @category Source
 */
export interface ParsingOptions {
    /** Data informations contained in the file. */
    in: Source;
    /** Options indicating how the features should be built. */
    out: FeatureBuildingOptions | Layer;
}
