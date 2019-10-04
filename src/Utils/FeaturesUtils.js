import { FEATURE_TYPES } from 'Core/Feature';
import Extent from 'Core/Geographic/Extent';
import Crs from 'Core/Geographic/Crs';

function pointIsOverLine(point, linePoints, epsilon, offset, count, size) {
    const x0 = point.x;
    const y0 = point.y;
    // for each segment of the line (j is i -1)
    for (var i = offset + size, j = offset; i < offset + count; j = i, i += size) {
        /* **********************************************************
            norm     : norm of vector P1P2
            distance : distance point P0 to line P1P2
            scalar   : dot product of P1P0 and P1P2 divide by norm, it represents the projection of P0 on the line

            Point is over segment P1P2 if :
                * if the distance, , is inferior to epsilon
                * and if :  -epsilon ≤ scalar ≤ (||P1P2|| +  epsilon)

                            + (P0) _
                            |      |
                            |      |
             <---scalar---->|    distance
                            |      |
                            |      v
             +-------------------------------+
            (P1)                            (P2)
        *********************************************************** */

        const x1 = linePoints[i];
        const y1 = linePoints[i + 1];
        const x2 = linePoints[j];
        const y2 = linePoints[j + 1];

        const Xp = x0 - x1;
        const Yp = y0 - y1;

        const x21 = x2 - x1;
        const y21 = y2 - y1;
        const norm = Math.sqrt(x21 * x21 + y21 * y21);
        const scalar = (Xp * x21 + Yp * y21) / norm;

        if (scalar >= -epsilon && scalar <= norm + epsilon) {
            const distance = Math.abs(y21 * x0 - x21 * y0 + x2 * y1 - y2 * x1) / norm;
            if (distance <= epsilon) {
                return true;
            }
        }
    }

    return false;
}

function getClosestPoint(point, points, epsilon, offset, count, size) {
    const x0 = point.x;
    const y0 = point.y;
    let squaredEpsilon = epsilon * epsilon;
    let closestPoint;
    for (var i = offset; i < offset + count; i += size) {
        const x1 = points[i];
        const y1 = points[i + 1];
        const xP = x0 - x1;
        const yP = y0 - y1;
        const n = xP * xP + yP * yP;
        if (n < squaredEpsilon) {
            closestPoint = [points[i], points[i + 1]];
            squaredEpsilon = n;
        }
    }
    return closestPoint;
}

function pointIsInsidePolygon(point, polygonPoints, offset, count, size) {
    // ray-casting algorithm based on
    // http://wrf.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

    const x = point.x;
    const y = point.y;

    let inside = false;
    // in first j is last point of polygon
    // for each segment of the polygon (j is i -1)
    // debugger;
    for (let i = offset, j = offset + count - size; i < offset + count; j = i, i += size) {
        const xi = polygonPoints[i];
        const yi = polygonPoints[i + 1];
        const xj = polygonPoints[j];
        const yj = polygonPoints[j + 1];

        // isIntersect semi-infinite ray horizontally with polygon's edge
        const isIntersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (isIntersect) {
            inside = !inside;
        }
    }

    return inside;
}

function isFeatureSingleGeometryUnderCoordinate(coordinate, type, coordinates, epsilon, offset, count, size) {
    if ((type == FEATURE_TYPES.LINE) && pointIsOverLine(coordinate, coordinates, epsilon, offset, count, size)) {
        return true;
    } else if ((type == FEATURE_TYPES.POLYGON) && pointIsInsidePolygon(coordinate, coordinates, offset, count, size)) {
        return true;
    } else if (type == FEATURE_TYPES.POINT) {
        const closestPoint = getClosestPoint(coordinate, coordinates, epsilon, offset, count, size);
        if (closestPoint) {
            return { coordinates: closestPoint };
        }
    }
}

function isFeatureUnderCoordinate(coordinate, feature, epsilon, result) {
    const featCoord = coordinate.as(feature.crs);
    for (const geometry of feature.geometry) {
        if (geometry.extent == undefined || geometry.extent.isPointInside(featCoord, epsilon)) {
            const offset = geometry.indices[0].offset * feature.size;
            const count = geometry.indices[0].count * feature.size;
            const under = isFeatureSingleGeometryUnderCoordinate(featCoord, feature.type, feature.vertices, epsilon, offset, count, feature.size);
            if (under) {
                result.push({
                    type: feature.type,
                    geometry,
                    coordinates: under.coordinates /* || coordinates */,
                });
            }
        }
    }
}

const ex = new Extent('EPSG:4326', 0, 0, 0, 0);
export default {
    /**
     * Filter from a list of features, features that are under a coordinate.
     *
     * @param {Coordinates} coordinate - The coordinate for the filter
     * condition.
     * @param {Feature|FeatureCollection} features - A single feature or a
     * collection of them, to filter given the previous coordinate.
     * @param {number} [epsilon=0.1] Tolerance around the coordinate (in
     * coordinate's unit).
     *
     * @return {Feature[]} Array of filtered features.
     */
    filterFeaturesUnderCoordinate(coordinate, features, epsilon = 0.1) {
        const result = [];

        // We can take this shortcut because either Feature and
        // FeatureCollection have an extent property
        if (features.extent) {
            // Special case, because of the way tiles in VectorTileParser are
            // handled (see Feature2Texture for a similar solution)
            if ((features.scale.x != 1 && features.scale.y != 1)
                || (features.translation.x != 0 && features.translation.y != 0)) {
                ex.crs = coordinate.crs;
                features.extent.as(coordinate.crs, ex);
                if (!ex.isPointInside(coordinate, epsilon)) {
                    return result;
                }

                coordinate.crs = Crs.formatToEPSG(features.extent.crs);
                coordinate.x = (coordinate.x + features.translation.x) * features.scale.x;
                coordinate.y = (coordinate.y + features.translation.y) * features.scale.y;
                if (features.scale.x != 1 && features.scale.y != 1) {
                    epsilon *= Math.sqrt(features.scale.x ** 2 + features.scale.y ** 2);
                }
            } else if (!features.extent.isPointInside(coordinate, epsilon)) {
                return result;
            }
        }
        if (Array.isArray(features.features)) {
            for (const feature of features.features) {
                if (feature.extent && !feature.extent.isPointInside(coordinate, epsilon)) {
                    continue;
                }

                isFeatureUnderCoordinate(coordinate, feature, epsilon, result);
            }
        } else if (features.geometry) {
            isFeatureUnderCoordinate(coordinate, features, epsilon, result);
        }

        return result;
    },
};
