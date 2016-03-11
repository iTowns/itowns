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
    
    var groupTerrain = [14, 11, 7, 3];   
    var l_ELEVATION = 0;
    var l_COLOR = 1;
    
    function TileMesh(bbox, cooWMTS, builder, id, geometryCache,link) {
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

        var params = {bbox:this.bbox,zoom:cooWMTS.zoom,segment:precision,center3D:null,projected:null}

        this.geometry = defaultValue(geometryCache, new TileGeometry(params, builder));
    
        // TODO Try to remove this.absoluteCenter
        this.absoluteCenter = params.center3D;

        // TODO Question in next line ???
        this.centerSphere = new THREE.Vector3().addVectors(this.geometry.boundingSphere.center, this.absoluteCenter);
        
        this.oSphere = new THREE.Sphere(this.centerSphere.clone(),this.geometry.boundingSphere.radius);
        
        this.orthoNeed = 0;        
        this.material = new LayeredMaterial(id);
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

    TileMesh.prototype = Object.create(NodeMesh.prototype);

    TileMesh.prototype.constructor = TileMesh;

    TileMesh.prototype.dispose = function() {
        // TODO à mettre dans node mesh
        this.material.dispose();
        this.geometry.dispose();
        this.geometry = null;
        this.material = null;
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
        this.material.visible = true;
    };

    TileMesh.prototype.useParent = function() {
        return this.level !== this.levelTerrain;
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
    
    TileMesh.prototype.setTerrain = function(terrain) {
        var texture = undefined;
        var pitScale;
        var ancestor;
        var image;
        var minMax = new THREE.Vector2();
        
        if (terrain === -1){ // No texture
                        
            this.currentLevelLayers[l_ELEVATION] = -2;
        }
        else if (terrain === -2) {// get ancestor texture
                        
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
                    this.setAltitude(minMax.x, minMax.y);

                this.currentLevelLayers[l_ELEVATION] = ancestor.currentLevelLayers[l_ELEVATION];
            }
            
        } else {
                        
            texture = terrain.texture;            
            pitScale = new THREE.Vector3(0,0,1);
            this.setAltitude(terrain.min, terrain.max);
            this.currentLevelLayers[l_ELEVATION] = terrain.level;                        
        }
      
        this.material.setTexture(texture,l_ELEVATION, 0, pitScale);
    };

    TileMesh.prototype.setAltitude = function(min, max) {
    
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

    TileMesh.prototype.setTextureOrtho = function(texture, id,pitch) {
        id = id === undefined ? 0 : id;
        id = texture === -1 ? undefined: texture; // TODO remove this, place undefined before
        this.material.setTexture(texture, l_COLOR, id,pitch);   
                
        this.currentLevelLayers[l_COLOR] = texture.level;
        this.checkOrtho();
    };
    
    TileMesh.prototype.setTexturesLayer = function(textures,id){
        
        if(!textures || this.material === null)
            return;
        
        this.material.setTexturesLayer(textures, id);
        
        this.currentLevelLayers[l_COLOR] = textures[0].texture.level;
        
        this.checkOrtho();
    };
        
    TileMesh.prototype.downScaledLayer = function(id)
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

    TileMesh.prototype.checkOrtho = function() {
        
        // TODO remove this function

        if (this.orthoNeed + 1 === this.material.getNbTextures() || this.level < 2){

            this.loaded = true;   
                  
            var parent = this.parent;

            if (parent !== null && parent.childrenLoaded()) {
                parent.wait = false;
            }
        }
    };

    return TileMesh;

});
