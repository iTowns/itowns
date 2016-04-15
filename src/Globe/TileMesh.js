/**
 * Generated On: 2015-10-5
 * Class: TileMesh
 * Description: Tuile de maillage, noeud du quadtree MNT. Le Materiel est issus du QuadTree ORTHO.
 */

/**
 *
 * @param {type} NodeMesh
 * @param {type} TileGeometry
 * @param {type} BoundingBox
 * @param {type} defaultValue
 * @param {type} THREE
 * @param {type} OBBHelper
 * @param {type} SphereHelper
 * @param {type} LayeredMaterial
 * @param {type} CoordCarto
 * @returns {EllipsoidTileMesh_L20.TileMesh}
 */
define('Globe/TileMesh', [
    'Renderer/NodeMesh',
    'Globe/TileGeometry',
    'Scene/BoundingBox',
    'Core/defaultValue',
    'THREE',
    'OBBHelper',
    'SphereHelper',
    'Renderer/LayeredMaterial'
], function(NodeMesh, TileGeometry, BoundingBox, defaultValue, THREE, OBBHelper, SphereHelper, LayeredMaterial) {

    var groupelevation = [14, 11, 7, 3];
    var l_ELEVATION = 0;
    var l_COLOR = 1;

    function TileMesh(params) {
        //Constructor
        NodeMesh.call(this);

        this.matrixAutoUpdate = false;
        this.rotationAutoUpdate = false;

        this.level = params.level;  // TODO: maybe build full WMTS coord?
        this.bbox = defaultValue(params.bbox, new BoundingBox());

        this.texturesNeeded = 0;
        this.material = new LayeredMaterial();
        this.frustumCulled = false;
        this.levelElevation = this.level;
        this.updateElevation = true;
        this.updateImagery = true;
        this.updateGeometry = true;

        // TODO not generic
        for (var i = 0; i < groupelevation.length; i++) {
            var gLev = groupelevation[i];
            if (this.level >= gLev) {
                this.levelElevation = gLev;
                break;
            }
        }

        // Layer
        this.currentLevelLayers =[];
        this.currentLevelLayers[l_ELEVATION] = -1;
        this.currentLevelLayers[l_COLOR] = -1;

    }

    TileMesh.prototype = Object.create(NodeMesh.prototype);

    TileMesh.prototype.constructor = TileMesh;

    TileMesh.prototype.buildHelper = function() {

        // TODO Dispose HELPER!!!
        var text = (this.level + 1).toString();

        var showHelperBox = true;

        if(showHelperBox)
            this.helper = new THREE.OBBHelper(this.geometry.OBB, text);
        else
            this.helper  = new THREE.SphereHelper(this.geometry.boundingSphere.radius);

        if (this.helper instanceof THREE.SphereHelper)

            this.helper.position.add(new THREE.Vector3().setFromMatrixPosition(this.matrixWorld));

        else if (this.helper instanceof THREE.OBBHelper)

            this.helper.translateZ(this.distance);

        this.link.add(this.helper);

    };



    TileMesh.prototype.dispose = function() {
        // TODO à mettre dans node mesh
        this.material.dispose();
        this.geometry.dispose();
        this.geometry = null;
        this.material = null;
        this.disposed = true;
    };

    /**
    *

     * @returns {undefined}     */
    TileMesh.prototype.disposeChildren = function() {
        while (this.children.length > 0) {
            var child = this.children[0];
            this.remove(child);
            child.dispose();
        }
    };

    TileMesh.prototype.useParent = function() {
        return this.level !== this.levelElevation;
    };

    TileMesh.prototype.enableRTC = function(enable) {
        this.material.enableRTC(enable);
    };

    TileMesh.prototype.enablePickingRender = function(enable) {
        this.material.enablePickingRender(enable);
    };

    TileMesh.prototype.setFog = function(fog) {
        this.material.setFogDistance(fog);
    };

    TileMesh.prototype.setMatrixRTC = function(rtc) {
        this.material.setMatrixRTC(rtc);
    };

    TileMesh.prototype.setDebug = function(enable) {
        this.material.setDebug(enable);
    };

    TileMesh.prototype.setSelected = function(select) {
        this.material.setSelected(select);
    };

    TileMesh.prototype.setGeometry = function(geometry) {
        this.updateGeometry = false;
        this.cullable = true;


        this.geometry = geometry;

        this.normal = geometry.center.clone().normalize();

        this.distance = geometry.center.length();
        // TODO Why move sphere center
        this.centerSphere = new THREE.Vector3().addVectors(geometry.boundingSphere.center, geometry.center);

        this.oSphere = new THREE.Sphere(this.centerSphere.clone(), geometry.boundingSphere.radius);
    };

    TileMesh.prototype.parseBufferElevation = function(image,minMax,pitScale) {

        var buffer = image.data;

        var size = Math.floor(pitScale.z * image.width);
        var xs = Math.floor(pitScale.x * image.width);
        var ys = Math.floor(pitScale.y * image.width);

        var oMinMax = minMax.clone();

        minMax.y = -1000000;
        minMax.x =  1000000;

        var inc = Math.max(Math.floor(size/8),2);

        for (var y  = ys; y <  ys + size; y+=inc){
            var pit = y * image.width;
            for (var x = xs; x < xs +size; x+=inc) {
                var val = buffer[pit + x];
                if (val > -10.0 && val !== undefined){
                    minMax.y = Math.max(minMax.y, val);
                    minMax.x = Math.min( minMax.x, val);
                }
            }
        }

        if(minMax.x === 1000000 || minMax.y === -1000000)
            minMax.copy(oMinMax);

    };

    TileMesh.prototype.setTextureElevation = function(elevation) {
        this.updateElevation = false;

        var texture;
        var pitScale;
        var ancestor;
        var image;
        var minMax = new THREE.Vector2();

        if (elevation === -1){ // No texture

            this.currentLevelLayers[l_ELEVATION] = -2;
        }
        else if (elevation === -2) {// get ancestor texture

            var levelAncestor = this.getParentNotDownScaled(l_ELEVATION).currentLevelLayers[l_ELEVATION];
            ancestor = this.getParentLevel(levelAncestor);

            if(ancestor) // TODO WHY -> because levelAncestor === -2
            {

                pitScale = ancestor.bbox.pitScale(this.bbox);
                texture = ancestor.material.Textures[l_ELEVATION][0];
                image = texture.image;

                minMax.y = ancestor.bbox.maxCarto.altitude;
                minMax.x = ancestor.bbox.minCarto.altitude;

                this.parseBufferElevation(image,minMax,pitScale);

                if(minMax.x !== 0 && minMax.y !== 0)
                    this.setBBoxZ(minMax.x, minMax.y);

                this.currentLevelLayers[l_ELEVATION] = ancestor.currentLevelLayers[l_ELEVATION];
            }
            else
                this.currentLevelLayers[l_ELEVATION] = -2;

        } else {

            texture = elevation.texture;
            pitScale = new THREE.Vector3(0,0,1);
            this.setBBoxZ(elevation.min, elevation.max);
            this.currentLevelLayers[l_ELEVATION] = elevation.level;
        }

        this.material.setTexture(texture,l_ELEVATION, 0, pitScale);
    };

    TileMesh.prototype.getStatus = function () {
        if(this.updateGeometry) {
            return "geometry";
        } else if(this.updateElevation) {
            // TODO: use parent data while waiting?
            return "elevation";
        } else if(this.updateImagery) {
            // TODO: use parent data while waiting?
            return "imagery";
        }
        return "ready";
    };

    TileMesh.prototype.setBBoxZ = function(min, max) {

        if(Math.floor(min) !== Math.floor(this.bbox.minCarto.altitude) || Math.floor(max) !== Math.floor(this.bbox.maxCarto.altitude) )
        {

            this.bbox.setBBoxZ(min, max);
            var delta = this.geometry.OBB.addHeight(this.bbox);

            var trans = this.normal.clone().setLength(delta.y);

            this.geometry.boundingSphere.radius = Math.sqrt(delta.x * delta.x + this.oSphere.radius * this.oSphere.radius);
            this.centerSphere = new THREE.Vector3().addVectors(this.oSphere.center,trans);

            if (this.helper instanceof THREE.OBBHelper) {
                this.helper.update(this.geometry.OBB);
                this.helper.translateZ(this.distance);
            } else if (this.helper instanceof THREE.SphereHelper) {
                this.helper.update(this.geometry.boundingSphere.radius);
                this.helper.position.add(trans);
            }
        }
    };

    TileMesh.prototype.setTexturesLayer = function(textures,idLayer){
        this.updateImagery = false;


        if(!textures || this.material === null)
        {
            return;
        }

        this.material.setTexturesLayer(textures, idLayer);

        this.currentLevelLayers[l_COLOR] = textures[0].texture.level;
    };

    TileMesh.prototype.downScaledLayer = function(id)
    {
        if(id === l_ELEVATION)
            if(this.level <= 3 || this.currentLevelLayers[l_ELEVATION] === -2)
                return false;
            else
                return this.currentLevelLayers[l_ELEVATION] < this.levelElevation ;

        else if(id === l_COLOR)
            if(this.level < 2)
                return false;
            else
                return this.currentLevelLayers[l_COLOR] < this.level + 1;

        return false;
    };

    TileMesh.prototype.getDownScaledLayer = function()
    {
        if(this.downScaledLayer(l_COLOR))
            return l_COLOR;
        else if(this.downScaledLayer(l_ELEVATION))
            return l_ELEVATION;
        else
            return undefined;
    };

    TileMesh.prototype.normals = function() {
        return this.geometry.normals;
    };

    TileMesh.prototype.fourCorners = function() {
        return this.geometry.fourCorners;
    };

    TileMesh.prototype.normal = function() {
        return this.geometry.normal;
    };

    TileMesh.prototype.center = function() {
        return this.geometry.center;
    };

    TileMesh.prototype.OBB = function() {
        return this.geometry.OBB;
    };

    TileMesh.prototype.getParentNotDownScaled = function(layer)
    {
        return !this.parent.downScaledLayer(layer) ? this.parent : this.parent.getParentNotDownScaled(layer);
    };

    TileMesh.prototype.allTexturesAreLoaded = function(){
        return this.texturesNeeded === this.material.nbLoadedTextures();
    };

    return TileMesh;

});
