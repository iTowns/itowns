import * as itowns from 'itowns';

export type LayerType = (
    itowns.ColorLayer |
    itowns.FeatureGeometryLayer |
    itowns.ElevationLayer |
    itowns.PointCloudLayer |
    itowns.OGC3DTilesLayer |
    itowns.CopcLayer |
    itowns.OrientedImageLayer |
    itowns.LabelLayer
) & {
    visible?: boolean,
}
