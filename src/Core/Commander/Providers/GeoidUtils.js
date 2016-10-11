
import THREE from 'THREE';
import IoDriverTXT from 'Core/Commander/Providers/IoDriver_TXT';
import CoordCarto from 'Core/Geographic/CoordCarto';
import Text2Json from 'Text2Json';

function _toCartesian(elem,ellipsoid) {
    var coordCarto = new CoordCarto();

    var longitude = elem[2];
    var latitude  = elem[1];
    var elevation = elem[3];

    return ellipsoid.cartographicToCartesian(coordCarto.setFromDegreeGeo(longitude,latitude,elevation));
}


function _matrixify( source, count )
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
}

function _standarlizeData(data){
    var TXT = Text2Json(data);
    var json = JSON.parse(JSON.stringify(TXT));
    //site   lat[deg]   lon[deg]   h[m]   ve[mm/y]   vn[mm/y]   vh[mm/y]
    var tmp = json.map(function(x){return x.replace(/\s+/g, ',');});
    return tmp.reduce(function(prev, curr) {
                        return prev.concat(curr.split(',').map(parseFloat));
            }, []);
}

function _GeoidDataToThreeJS(data,ellipsoid) {
    if (!data) {
        return undefined;
    }

    var jdata = _matrixify(_standarlizeData(data),7);
    
    var pos = _toCartesian(jdata[0], ellipsoid);
    
    var target = new THREE.Vector3(0, 0, 0);
    var direction = new THREE.Vector3().sub(target, pos);
    //return new THREE.ArrowHelper(direction.clone().normalize(), pos, direction.length(), 0x00ff00);
    
    var material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); 
    var geometry = new THREE.SphereGeometry(500, 64, 64); 
    var sphere = new THREE.Mesh(geometry, material); 
    sphere.position.copy(pos);
    return sphere;
}

export default function loadGeoidData(urlFile,ellipsoid) {
    var IoDriver = new IoDriverTXT();

    return IoDriver.read(urlFile).then(
        function(data) {
            return _GeoidDataToThreeJS(data,ellipsoid);
        });
}

