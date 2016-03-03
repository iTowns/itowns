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
 * @param {type} OBBHelper
 * @param {type} SphereHelper
 * @param {type} GlobeMaterial
 * @param {type} CoordCarto
 * @returns {EllipsoidTileMesh_L20.EllipsoidTileMesh}
 */
define('Globe/EllipsoidTileMesh', [
    'Renderer/NodeMesh',
    'Globe/EllipsoidTileGeometry',
    'Scene/BoundingBox',
    'Core/defaultValue',
    'THREE',
    'OBBHelper',
    'SphereHelper',
    'Renderer/GlobeMaterial',
    'Core/Geographic/CoordCarto'
], function(NodeMesh, EllipsoidTileGeometry, BoundingBox, defaultValue, THREE, OBBHelper, SphereHelper, GlobeMaterial, CoordCarto) {
    
    var groupTerrain = [14, 11, 7, 3];   
    var l_ELEVATION = 0;
    var l_COLOR = 1;
    
    function EllipsoidTileMesh(bbox, cooWMTS, ellipsoid, id, geometryCache,link) {
        //Constructor
        NodeMesh.call(this);

        this.matrixAutoUpdate = false;
        this.rotationAutoUpdate = false;
        
        this.level = cooWMTS.zoom;
        this.cooWMTS = cooWMTS;
        this.bbox = defaultValue(bbox, new BoundingBox());
        this.id = id;
        this.link = link;

        var precision = 16;
        var levelMax = 18;

        this.geometricError = Math.pow(2, (levelMax - this.level));
        this.geometry = defaultValue(geometryCache, new EllipsoidTileGeometry(bbox, precision, ellipsoid, this.level));
        var ccarto = new CoordCarto(bbox.center.x, bbox.center.y, 0);

        // TODO Try to remove this.absoluteCenter
        this.absoluteCenter = ellipsoid.cartographicToCartesian(ccarto);

        // TODO Question in next line ???
        this.centerSphere = new THREE.Vector3().addVectors(this.geometry.boundingSphere.center, this.absoluteCenter);
        
        this.oSphere = new THREE.Sphere(this.centerSphere.clone(),this.geometry.boundingSphere.radius);
        
        this.orthoNeed = 0;
        this.material = new GlobeMaterial(id);
        this.dot = 0;
        this.frustumCulled = false;
        this.maxChildren = 4;
        this.levelTerrain = this.level;

        for (var i = 0; i < groupTerrain.length; i++) {
            var gLev = groupTerrain[i];
            if (this.level >= gLev) {
                this.levelTerrain = gLev;
                break;
            }
        }
        
        // Layer        
        this.currentLevelLayers =[];
        this.currentLevelLayers[l_ELEVATION] = -1;
        this.currentLevelLayers[l_COLOR] = -1;
                
        var showHelper = true;
        showHelper = false;

        if (showHelper && this.level >= 2) {
            
            // TODO Dispose HELPER!!!
            var text = (this.level + 1).toString();

            if(showHelper)
                this.helper = new THREE.OBBHelper(this.geometry.OBB, text);
            else
                this.helper  = new THREE.SphereHelper(this.geometry.boundingSphere.radius);
            
            if (this.helper instanceof THREE.SphereHelper)

                this.helper.position.add(this.absoluteCenter);

            else if (this.helper instanceof THREE.OBBHelper)

                this.helper.translateZ(this.absoluteCenter.length());
                        
            if(this.helper)
                this.link.add(this.helper);

        }
        
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
        
    EllipsoidTileMesh.prototype.parseBufferElevation = function(image,minMax,pitScale) {

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
    
    EllipsoidTileMesh.prototype.setTerrain = function(terrain) {
        var texture;
        var pitScale;
        var ancestor;
        var image;
        var minMax = new THREE.Vector2();
        
        if (terrain === -1){
            
            texture = -1;
            this.currentLevelLayers[l_ELEVATION] = -2;
        }
        else if (terrain === -2) {
                        
            var levelAncestor = this.getParentNotDownScaled(l_ELEVATION).currentLevelLayers[l_ELEVATION];                        
            ancestor = this.getParentLevel(levelAncestor);            
            
            if(ancestor === undefined) // TODO WHY ??
                return;
                            
            pitScale = ancestor.bbox.pitScale(this.bbox);
            texture = ancestor.material.Textures_00[0];            
            image = texture.image;
            
            minMax.y = ancestor.bbox.maxCarto.altitude;
            minMax.x = ancestor.bbox.minCarto.altitude;
            
            this.parseBufferElevation(image,minMax,pitScale);                        
 
            if(minMax.x !== 0 && minMax.y !== 0)
                this.setAltitude(minMax.x, minMax.y);
            
            this.currentLevelLayers[l_ELEVATION] = ancestor.currentLevelLayers[l_ELEVATION];
            
        } else {
                        
            texture = terrain.texture;            
            pitScale = new THREE.Vector3(0,0,1);
            this.setAltitude(terrain.min, terrain.max);
            this.currentLevelLayers[l_ELEVATION] = terrain.level;                        
        }
      
        this.material.setTexture(texture,l_ELEVATION, 0, pitScale);
    };

    EllipsoidTileMesh.prototype.setAltitude = function(min, max) {
    
        if(Math.floor(min) !== Math.floor(this.bbox.minCarto.altitude) || Math.floor(max) !== Math.floor(this.bbox.maxCarto.altitude) )
        {            

            this.bbox.setAltitude(min, max);            
            var delta = this.geometry.OBB.addHeight(this.bbox);
            var trans = this.absoluteCenter.clone().setLength(delta.y);

            this.geometry.boundingSphere.radius = Math.sqrt(delta.x * delta.x + this.oSphere.radius * this.oSphere.radius); 
            this.centerSphere = new THREE.Vector3().addVectors(this.oSphere.center,trans);
            
            if (this.helper instanceof THREE.OBBHelper) {
                this.helper.update(this.geometry.OBB);
                this.helper.translateZ(this.absoluteCenter.length());
            } else if (this.helper instanceof THREE.SphereHelper) {
                this.helper.update(this.geometry.boundingSphere.radius);
                this.helper.position.add(trans);
            }
        }
    };

    EllipsoidTileMesh.prototype.setTextureOrtho = function(texture, id,pitch) {
        id = id === undefined ? 0 : id;
        this.material.setTexture(texture, 1, id,pitch);   
                
        this.currentLevelLayers[l_COLOR] = texture.level;
        this.checkOrtho();
    };
    
    EllipsoidTileMesh.prototype.setTexturesLayer = function(textures,id){
        
        if(!textures)
            return;
        
        this.material.setTexturesLayer(textures, id);
        
        this.currentLevelLayers[l_COLOR] = textures[0].texture.level;
        
        this.checkOrtho();
    };
        
    EllipsoidTileMesh.prototype.downScaledLayer = function(id)
    {
        if(id === l_ELEVATION)
            if(this.level < 3 || this.currentLevelLayers[l_ELEVATION] === -2)
                return false;
            else                                
                return this.currentLevelLayers[l_ELEVATION] < this.levelTerrain ;                        
        else if(id === l_COLOR)
            if(this.level < 2)
                return false;
            else              
                return this.currentLevelLayers[l_COLOR] < this.level + 1;            
        
        return false;        
    }; 
    
    EllipsoidTileMesh.prototype.getDownScaledLayer = function()     
    {
        if(this.downScaledLayer(l_COLOR))
            return l_COLOR;
        else if(this.downScaledLayer(l_ELEVATION))
            return l_ELEVATION;
        else
            return undefined;
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
    
    EllipsoidTileMesh.prototype.getParentNotDownScaled = function(layer) 
    {
        return !this.parent.downScaledLayer(layer) ? this.parent : this.parent.getParentNotDownScaled(layer);
    };

    EllipsoidTileMesh.prototype.checkOrtho = function() {
        
        // TODO remove this function

        if (this.orthoNeed + 1 === this.material.nbTextures || this.level < 2){

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
