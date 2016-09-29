import THREE from 'THREE';

var ItownsGeoJSON = function(options){

    THREE.Mesh.call(this);

    this.positions = [];
    this.previous = [];
    this.next = [];
    this.side = [];
    this.width = [];
    this.indices_array = [];
    this.uvs = [];

    this.geometry = new THREE.Geometry();
    this.material = new ItownsLineMaterial(options);
    this.widthCallback = null;
    //this.frustumCulled = false;
    //this.doubleSided = true;
};

ItownsGeoJSON.prototype = Object.create(THREE.Mesh.prototype);
ItownsGeoJSON.prototype.constructor = ItownsGeoJSON;

ItownsGeoJSON.prototype.parseGeoJSON(json, radius, shape, options) {
    
    var json_geom = createGeometryArray(json); 
    //An array to hold the feature geometries.
   /* var convertCoordinates = getConversionFunctionName(shape); 
    //Whether you want to convert to spherical or planar coordinates.
    var coordinate_array = []; 
    //Re-usable array to hold coordinate values. This is necessary so that you can add 
    //interpolated coordinates. Otherwise, lines go through the sphere instead of wrapping around.
    
    for (var geom_num = 0; geom_num < json_geom.length; geom_num++) {
                
        if (json_geom[geom_num].type == 'Point') {
            convertCoordinates(json_geom[geom_num].coordinates, radius);            
            drawParticle(y_values[0], z_values[0], x_values[0], options);
            
        } else if (json_geom[geom_num].type == 'MultiPoint') {
            for (var point_num = 0; point_num < json_geom[geom_num].coordinates.length; point_num++) {
                convertCoordinates(json_geom[geom_num].coordinates[point_num], radius);           
                drawParticle(y_values[0], z_values[0], x_values[0], options);                
            }
            
        } else if (json_geom[geom_num].type == 'LineString') {            
            coordinate_array = createCoordinateArray(json_geom[geom_num].coordinates);
            
            for (var point_num = 0; point_num < coordinate_array.length; point_num++) {
                convertCoordinates(coordinate_array[point_num], radius); 
            }             
            drawLine(y_values, z_values, x_values, options);
            
        } else if (json_geom[geom_num].type == 'Polygon') {                        
            for (var segment_num = 0; segment_num < json_geom[geom_num].coordinates.length; segment_num++) {
                coordinate_array = createCoordinateArray(json_geom[geom_num].coordinates[segment_num]);           
                
                for (var point_num = 0; point_num < coordinate_array.length; point_num++) {
                    convertCoordinates(coordinate_array[point_num], radius); 
                }
                drawLine(y_values, z_values, x_values, options);
            }                            
            
        } else if (json_geom[geom_num].type == 'MultiLineString') {
            for (var segment_num = 0; segment_num < json_geom[geom_num].coordinates.length; segment_num++) {
                coordinate_array = createCoordinateArray(json_geom[geom_num].coordinates[segment_num]);           
                
                for (var point_num = 0; point_num < coordinate_array.length; point_num++) {
                    convertCoordinates(coordinate_array[point_num], radius); 
                }
                drawLine(y_values, z_values, x_values, options);
            }             
            
        } else if (json_geom[geom_num].type == 'MultiPolygon') {
            for (var polygon_num = 0; polygon_num < json_geom[geom_num].coordinates.length; polygon_num++) {
                for (var segment_num = 0; segment_num < json_geom[geom_num].coordinates[polygon_num].length; segment_num++) {
                    coordinate_array = createCoordinateArray(json_geom[geom_num].coordinates[polygon_num][segment_num]);           
                    
                    for (var point_num = 0; point_num < coordinate_array.length; point_num++) {
                        convertCoordinates(coordinate_array[point_num], radius); 
                    }
                    drawLine(y_values, z_values, x_values, options);
                }
            }
        } else {
            throw new Error('The geoJSON is not valid.');
        }        
    } 
    */
} 


ItownsGeoJSON.createGeometryArray(json) {
    var geometry_array = [];
    
    if (json.type == 'Feature') {
        geometry_array.push(json.geometry);        
    } else if (json.type == 'FeatureCollection') {
        for (var feature_num = 0; feature_num < json.features.length; feature_num++) { 
            geometry_array.push(json.features[feature_num].geometry);            
        }
    } else if (json.type == 'GeometryCollection') {
        for (var geom_num = 0; geom_num < json.geometries.length; geom_num++) { 
            geometry_array.push(json.geometries[geom_num]);
        }
    } else {
        throw new Error('The geoJSON is not valid.');
    }    
    //alert(geometry_array.length);
    return geometry_array;
}
