import THREE from 'THREE';
import OBB from 'Renderer/ThreeExtented/OBB';

function PlanarTileBuilder() {

}

PlanarTileBuilder.prototype.constructor = PlanarTileBuilder;

// prepare params
// init projected object -> params.projected
PlanarTileBuilder.prototype.Prepare = function(params)
{
    params.nbRow = Math.pow(2.0, params.zoom + 1.0);
    params.projected = new THREE.Vector3();
};


// get center tile in cartesian 3D
PlanarTileBuilder.prototype.Center = function(params)
{
    params.center = new THREE.Vector3(params.bbox.center.x, params.bbox.center.y, 0);
    return params.center;
};

// get position 3D cartesian
PlanarTileBuilder.prototype.VertexPosition = function(params)
{
    return params.projected;
};

// get normal for last vertex
PlanarTileBuilder.prototype.VertexNormal = function(/*params*/)
{
    return new THREE.Vector3(0.0,0.0,1.0);
};

// coord u tile to projected
PlanarTileBuilder.prototype.uProjecte = function(u,params)
{
    params.projected.x = params.bbox.minCarto.longitude + u * (params.bbox.maxCarto.longitude - params.bbox.minCarto.longitude);
};

// coord v tile to projected
PlanarTileBuilder.prototype.vProjecte = function(v,params)
{
    params.projected.y = params.bbox.minCarto.latitude + v * (params.bbox.maxCarto.latitude - params.bbox.minCarto.latitude);
};

// get oriented bounding box of tile
PlanarTileBuilder.prototype.OBB = function(params)
{
    var max = new THREE.Vector3(params.bbox.maxCarto.longitude, params.bbox.maxCarto.latitude, 0);
    var min = new THREE.Vector3(params.bbox.minCarto.longitude, params.bbox.minCarto.latitude, 0);
    var translate = new THREE.Vector3(0,0,0);
    var normal = new THREE.Vector3(0,0,1);

    return new OBB(min, max, normal, translate);
};

export default PlanarTileBuilder;
