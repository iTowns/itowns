
import THREE from 'THREE';
import IoDriverTXT from 'Core/Commander/Providers/IoDriver_TXT';
import CoordCarto from 'Core/Geographic/CoordCarto';
import Text2Json from 'Text2Json';


/**
 * Returns the point at given fraction between ‘this’ point and specified point.
 *
 * @param   {LatLon} point - Latitude/longitude of destination point.
 * @param   {number} fraction - Fraction between the two points (0 = this point, 1 = specified point).
 * @returns {LatLon} Intermediate point between this point and destination point.
 *
 * @example
 *   let p1 = new CoordCarto(52.205, 0.119, 100);
 *   let p2 = new CoordCarto(48.857, 2.351, 200);
 *   let pMid = p1.intermediatePointTo(p2, 0.25); // 51.3721°N, 000.7073°E
 */
function intermediatePointTo(ori, dest, fraction) {
    
    if (ori == undefined) throw new TypeError('point is required');

    var point = ori.clone().toRadians();
    var point2 = dest.clone().toRadians();
    
    var φ1 = point.getLat(); λ1 = point.getLon();
    var φ2 = point2.getLat(); λ2 = point2.getLon();
    
    var sinφ1 = Math.sin(φ1), cosφ1 = Math.cos(φ1), sinλ1 = Math.sin(λ1), cosλ1 = Math.cos(λ1);
    var sinφ2 = Math.sin(φ2), cosφ2 = Math.cos(φ2), sinλ2 = Math.sin(λ2), cosλ2 = Math.cos(λ2);

    // distance between points
    var Δφ = φ2 - φ1;
    var Δλ = λ2 - λ1;
    var a = Math.sin(Δφ/2) * Math.sin(Δφ/2)
        + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    var δ = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    var A = Math.sin((1-fraction)*δ) / Math.sin(δ);
    var B = Math.sin(fraction*δ) / Math.sin(δ);

    var x = A * cosφ1 * cosλ1 + B * cosφ2 * cosλ2;
    var y = A * cosφ1 * sinλ1 + B * cosφ2 * sinλ2;
    var z = A * sinφ1 + B * sinφ2;

    var φ3 = Math.atan2(z, Math.sqrt(x*x + y*y));
    var λ3 = Math.atan2(y, x);
    // normalise lon to −180..+180°
    return new CoordCarto(φ3*(180 / Math.PI), (λ3*(180 / Math.PI) + 540)%360-180); 
};


function _toCartesian(elem, ellipsoid) {
    var coordCarto = new CoordCarto();

    var lon = elem[2];
    var lat = elem[1];
    var elevation = elem[3];

    var origin =  ellipsoid.cartographicToCartesian(coordCarto.setFromDegreeGeo(lon,lat,elevation));

    var e       = 100000;
    //O + (e * v_est, e * v_nord, e * v_up)
    var lon2  = elem[4];
    var lat2  = elem[5];
    var h2    = elem[6];

    var target =  ellipsoid.cartographicToCartesian(coordCarto.setFromDegreeGeo(lon2,lat2,h2));

    var direction = new THREE.Vector3().sub(target, origin);

    return {position: origin, direction: direction, scale : e};
};

function _matrixify(source, count )
{
    var matrixified = [];
    var tmp;
    // iterate through the source array
    for( var i = 0; i < source.length; i++ )
    {
        // use modulous to make sure you have the correct length.
        if( i % count == 0 )
        {
            // if tmp exists, push it to the return array
            if( tmp && tmp.length ) matrixified.push(tmp);
            // reset the temporary array
            tmp = [];
        }
        // add the current source value to the temp array.
        tmp.push(source[i])
    }
    // return the result
    return matrixified;
};

function _standarlizeData(data){
    var TXT = Text2Json(data);
    var json = JSON.parse(JSON.stringify(TXT));
    //site   lat[deg]   lon[deg]   h[m]   ve[mm/y]   vn[mm/y]   vh[mm/y]
    var tmp = json.map(function(x){return x.replace(/\s+/g, ',');});
    return tmp.reduce(function(prev, curr) {
                        return prev.concat(curr.split(',').map(parseFloat));
            }, []);
};

function _GeoidDataToThreeJS(data,ellipsoid) {
    if (!data) {
        return undefined;
    }

    var group = new THREE.Object3D();

    var jdata = _matrixify(_standarlizeData(data),7);

    for(var i = 0; i < jdata.length; i++){ //
        var tmp = _toCartesian(jdata[i], ellipsoid);
            group.add(new THREE.ArrowHelper(tmp.direction.clone().normalize(), tmp.position, tmp.scale, 0xccff00));
    }
    return group;
};

export default function loadGeoidData(urlFile,ellipsoid){
    var IoDriver = new IoDriverTXT();

    return IoDriver.read(urlFile).then(
        function(data) {
            return _GeoidDataToThreeJS(data,ellipsoid);
        });
}

