/**
 * Generated On: 2015-10-5
 * Class: Globe
 * Description: Le globe est le noeud du globe (node) principale.
 */

define('Globe/Globe', [
    'Core/defaultValue',
    'Scene/Layer',
    'Scene/Quadtree',
    'Scene/SchemeTile',
    'Core/Math/MathExtented',
    'Core/Math/Ellipsoid',
    'Globe/EllipsoidTileMesh',
    'Globe/Atmosphere',
    'Globe/Clouds',
    'Core/System/Capabilities',
    'Core/Geographic/CoordCarto',
    'Renderer/BasicMaterial',
    'THREE'
], function(defaultValue, Layer, Quadtree, SchemeTile, MathExt,
    Ellipsoid, EllipsoidTileMesh, Atmosphere, Clouds, Capabilities,
    CoordCarto, BasicMaterial, THREE) {

    function Globe(supportGLInspector) {
        //Constructor

        Layer.call(this);

        var scale = defaultValue(scale, 1.0);
        var caps = new Capabilities();
        this.NOIE = !caps.isInternetExplorer();
        this.supportGLInspector = supportGLInspector;
        this.size = new THREE.Vector3(6378137, 6356752.3142451793, 6378137).multiplyScalar(scale);
        this.ellipsoid = new Ellipsoid(this.size);
        
        this.batiments = new Layer();
        this.layerWGS84Zup = new Layer();

        var kml = new THREE.Object3D();
        this.batiments.add(kml);

        this.terrain = new Quadtree(EllipsoidTileMesh, this.SchemeTileWMTS(2), this.size, kml);
        this.colorTerrain = new Layer();
        
        this.terrain.add(this.colorTerrain);
        
        this.atmosphere = this.NOIE ? new Atmosphere(this.size) : undefined;
        this.clouds = new Clouds();

        var material = new BasicMaterial(new THREE.Color(1, 0, 0));
        
        var geometry = new THREE.SphereGeometry(5);
        var batiment = new THREE.Mesh(geometry, material);

        var position = this.ellipsoid.cartographicToCartesian(new CoordCarto().setFromDegreeGeo(48.87, 0, 200));        
        
        position = new THREE.Vector3(4201215.424138484,171429.945145441,4779294.873914789);
        
        // http://www.apsalin.com/convert-geodetic-to-cartesian.aspx
        // 48.846931,2.337219,50
        position = new THREE.Vector3(4201801.65418896,171495.727885073,4779411.45896233);
        
        //position = this.ellipsoid.cartographicToCartesian(new CoordCarto().setFromDegreeGeo(48.87, 0, 200));
        
        batiment.frustumCulled = false;
        //material.wireframe      = true;
        batiment.position.copy(position);

        var material2 = new BasicMaterial(new THREE.Color(1, 0.5, 1));
        material2.visible = false;
        var batiment2 = new THREE.Mesh(geometry, material2);
        var position2 = this.ellipsoid.cartographicToCartesian(new CoordCarto().setFromDegreeGeo(48.87, 0.001, 100));
        batiment2.frustumCulled = false;
        material2.wireframe = true;
        batiment2.position.copy(position2);

        //kml.add( batiment );        
        //kml.add( batiment2 );
        
        var zUp = new THREE.Object3D();
        
        zUp.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 ));
        zUp.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ),  Math.PI ));
        
        this.layerWGS84Zup.add(zUp);
        zUp.add(new THREE.AxisHelper( 10000000 ));        
        zUp.add(batiment);
        
        this.add(this.terrain);
        this.add(this.batiments);
        //this.add(this.layerWGS84Zup);
       
        if (this.atmosphere !== undefined && !this.supportGLInspector) {
            this.atmosphere.add(this.clouds);
            this.add(this.atmosphere);
        }        
    }

    Globe.prototype = Object.create(Layer.prototype);

    Globe.prototype.constructor = Globe;

    /**
     * @documentation: Rafrachi les mat�riaux en fonction du quadTree ORTHO
     *
     */
    Globe.prototype.QuadTreeToMaterial = function() {
        //TODO: Implement Me 

    };
    
    Globe.prototype.updateQuadtree = function(){
        this.terrain = new Quadtree(EllipsoidTileMesh, this.SchemeTileWMTS(2), this.size, false);
    };

    Globe.prototype.SchemeTileWMTS = function(type) {
        //TODO: Implement Me 
        if (type === 2) {
            var schemeT = new SchemeTile();
            schemeT.add(0, MathExt.PI, -MathExt.PI_OV_TWO, MathExt.PI_OV_TWO);
            schemeT.add(MathExt.PI, MathExt.TWO_PI, -MathExt.PI_OV_TWO, MathExt.PI_OV_TWO);
            return schemeT;
        }

    };

    Globe.prototype.showAtmosphere = function(show) {
        if (this.atmosphere !== undefined)
            this.atmosphere.visible = show;

    };

    Globe.prototype.showClouds = function(show) {

        if (this.clouds.live === false && show) {
            this.clouds.generate();
        }
        this.clouds.visible = show;
    };
    
         
    Globe.prototype.setRealisticLightingOn = function(bool) {

        this.atmosphere.setRealisticOn(bool);
        this.clouds.setLightingOn(bool);
        
    };

    /*Globe.prototype.ellipsoid = function() {
        return this.terrain.interCommand.managerCommands.providers[0].ellipsoid;
    };*/




    return Globe;

});
