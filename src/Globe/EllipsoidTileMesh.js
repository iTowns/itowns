/**
 * Generated On: 2015-10-5
 * Class: EllipsoidTileMesh
 * Description: Tuile de maillage, noeud du quadtree MNT. Le Materiel est issus du QuadTree ORTHO.
 */

/**
 * 
 * @param {type} NodeMesh
 * @param {type} EllipsoidTileGeometry
 * @param {type} BoundingBox
 * @param {type} defaultValue
 * @param {type} THREE
 * @param {type} Material
 * @returns {EllipsoidTileMesh_L10.EllipsoidTileMesh}
 */
define('Globe/EllipsoidTileMesh', [
    'Renderer/NodeMesh',
    'Globe/EllipsoidTileGeometry',
    'Scene/BoundingBox',
    'Core/defaultValue',
    'THREE',
    'Renderer/GlobeMaterial',
    'Core/Geographic/CoordCarto',
    'OBBHelper',
    'SphereHelper'
], function(NodeMesh, EllipsoidTileGeometry, BoundingBox, defaultValue, THREE, GlobeMaterial, CoordCarto, OBBHelper, SphereHelper) {

    function EllipsoidTileMesh(bbox, cooWMTS, ellipsoid, id, geometryCache) {
        //Constructor
        NodeMesh.call(this);


        this.level = cooWMTS.zoom;
        this.cooWMTS = cooWMTS;
        this.bbox = defaultValue(bbox, new BoundingBox());
        this.id = id;

        var precision = 16;
        var levelMax = 18;

        this.geometricError = Math.pow(2, (levelMax - this.level));
        this.geometry = defaultValue(geometryCache, new EllipsoidTileGeometry(bbox, precision, ellipsoid, this.level));
        var ccarto = new CoordCarto(bbox.center.x, bbox.center.y, 0);

        // TODO modif ver world coord de three.js 
        this.absoluteCenter = ellipsoid.cartographicToCartesian(ccarto);
        this.waterHeight = defaultValue.waterHeight;

        // TODO ??? 
        this.centerSphere = new THREE.Vector3().addVectors(this.geometry.boundingSphere.center, this.absoluteCenter);
        this.orthoNeed = 0;
        this.material = new GlobeMaterial(bbox, id, this.waterHeight);
        this.dot = 0;
        this.frustumCulled = false;
        this.maxChildren = 4;

        var groupTerrain = [14, 11, 7, 3];
        this.levelTerrain = this.level;

        for (var i = 0; i < groupTerrain.length; i++) {
            var gLev = groupTerrain[i];
            if (this.level >= gLev) {
                this.levelTerrain = gLev;
                break;
            }
        }


        //  TODO : Attention ne marche plus car les helpers ne sont plus ajouter à la scene
        /*
        var showHelper = true;
        showHelper = false;

        if (showHelper && this.level >= 2) {

            //this.helper  = new THREE.SphereHelper(this.geometry.boundingSphere.radius);

            //var text = 'z(' + this.level.toString() + '),r(' + cooWMTS.row + '),c(' + cooWMTS.col + ')';
            var text = (this.level + 1).toString();

            this.helper = new THREE.OBBHelper(this.geometry.OBB, text);

            if (this.helper instanceof THREE.SphereHelper)

                this.helper.position.add(this.absoluteCenter);

            else if (this.helper instanceof THREE.OBBHelper)

                this.helper.translateZ(this.absoluteCenter.length());

        }
        */
    }

    EllipsoidTileMesh.prototype = Object.create(NodeMesh.prototype);

    EllipsoidTileMesh.prototype.constructor = EllipsoidTileMesh;

    EllipsoidTileMesh.prototype.dispose = function() {
        // TODO à mettre dans node mesh
        this.material.dispose();
        this.geometry.dispose();
        this.geometry = null;
        this.material = null;
    };

    /**
    * 

     * @returns {undefined}     */
    EllipsoidTileMesh.prototype.disposeChildren = function() {
        while (this.children.length > 0) {
            var child = this.children[0];
            this.remove(child);
            child.dispose();
        }
        this.material.visible = true;
    };

    EllipsoidTileMesh.prototype.useParent = function() {
        return this.level !== this.levelTerrain;
    };

    EllipsoidTileMesh.prototype.enableRTC = function(enable) {
        this.material.enableRTC(enable);
    };

    EllipsoidTileMesh.prototype.enablePickingRender = function(enable) {
        this.material.enablePickingRender(enable);
    };

    EllipsoidTileMesh.prototype.setFog = function(fog) {
        this.material.setFogDistance(fog);
    };

    EllipsoidTileMesh.prototype.setMatrixRTC = function(rtc) {
        this.material.setMatrixRTC(rtc);
    };

    EllipsoidTileMesh.prototype.setDebug = function(enable) {
        this.material.setDebug(enable);
    };

    EllipsoidTileMesh.prototype.setSelected = function(select) {
        this.material.setSelected(select);
    };

    EllipsoidTileMesh.prototype.setTerrain = function(terrain) {
        var texture;
        var pitScale;

        if (terrain === -1)
            texture = -1;
        else if (terrain === -2) {
            var parentBil = this.getParentLevel(this.levelTerrain);
            pitScale = parentBil.bbox.pitScale(this.bbox);
            texture = parentBil.material.Textures_00[0];

            this.setAltitude(parentBil.bbox.minCarto.altitude, parentBil.bbox.maxCarto.altitude);

        } else {
            texture = terrain.texture;
            this.setAltitude(terrain.min, terrain.max);
        }

        this.material.setTexture(texture, 0, 0, pitScale);
    };

    EllipsoidTileMesh.prototype.setAltitude = function(min, max) {
        this.bbox.setAltitude(min, max);
        var delta = this.geometry.OBB.addHeight(this.bbox);
        var trans = this.absoluteCenter.clone().setLength(delta.y);

        var radius = this.geometry.boundingSphere.radius;

        this.geometry.boundingSphere.radius = Math.sqrt(delta.x * delta.x + radius * radius);
        this.centerSphere.add(trans);

        if (this.helper instanceof THREE.OBBHelper) {
            this.helper.update(this.geometry.OBB);
            this.helper.translateZ(this.absoluteCenter.length());
        } else if (this.helper instanceof THREE.SphereHelper) {
            this.helper.update(this.geometry.boundingSphere.radius);
            this.helper.position.add(trans);
        }
    };

    EllipsoidTileMesh.prototype.setTextureOrtho = function(texture, id) {
        id = id === undefined ? 0 : id;
        this.material.setTexture(texture, 1, id);
        this.checkOrtho();
        //  if(this.material.nbTextures === this.material.Textures_01.length)
        //   this.visible = false;
    };

    EllipsoidTileMesh.prototype.normals = function() {
        return this.geometry.normals;
    };

    EllipsoidTileMesh.prototype.fourCorners = function() {
        return this.geometry.fourCorners;
    };

    EllipsoidTileMesh.prototype.normal = function() {
        return this.geometry.normal;
    };

    EllipsoidTileMesh.prototype.center = function() {
        return this.geometry.center;
    };

    EllipsoidTileMesh.prototype.OBB = function() {
        return this.geometry.OBB;
    };

    EllipsoidTileMesh.prototype.checkOrtho = function() {


        if (this.orthoNeed + 1 === this.material.nbTextures || this.level < 2)

        {

            this.loaded = true;
            this.material.update();

            var parent = this.parent;

            if (parent !== null && parent.childrenLoaded()) {
                parent.wait = false;
            }
        }
    };

    return EllipsoidTileMesh;

});
