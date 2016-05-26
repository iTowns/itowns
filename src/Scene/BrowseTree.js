/**
 * Generated On: 2015-10-5
 * Class: BrowseTree
 * Description: BrowseTree parcourt un arbre de Node. Lors du parcours un ou plusieur NodeProcess peut etre appliqué sur certains Node.
 */

define('Scene/BrowseTree', ['Globe/TileMesh', 'THREE'], function( TileMesh, THREE) {

    function BrowseTree(engine) {
        //Constructor

        this.oneNode = 0;
        this.gfxEngine = engine;
        this.nodeProcess = undefined;
        this.tree = undefined;
        this.fogDistance = 1000000000.0;
        this.mfogDistance = 1000000000.0;
        this.selectedNodeId = -1;
        this.selectedNode = null;
        this.cachedRTC = null;

        this.selectNode = function(){};

        this._resetQuadtreeNode;

        this.selectMode = false;
        //this.selectMode = true;

        if(this.selectMode)
        {
            this.selectNode = function(node){this._selectNode(node);};
            this._resetQuadtreeNode = function(node)
            {
                node.setVisibility(false);
                node.setSelected(false);
            };
        }
        else
            this._resetQuadtreeNode = function(node)
            {
                node.setVisibility(false);
            };

    }

    BrowseTree.prototype.addNodeProcess = function(nodeProcess) {
        this.nodeProcess = nodeProcess;
    };

    BrowseTree.prototype.NodeProcess = function() {
        return this.nodeProcess;
    };

    BrowseTree.prototype.resetQuadtreeNode = function(node){
        this._resetQuadtreeNode(node);
    };

    /**
     * @documentation: Process to apply to each node
     * @param {type} node   : node current to apply process
     * @param {type} camera : current camera needed to process
     * @param {type} enableUp  : optional process
     * @returns {Boolean}
     */
    BrowseTree.prototype.processQuadtreeNode = function(node, camera, process, params)
    {

        this.resetQuadtreeNode(node);

        if(node.parent.material.visible)
            return false;

        process.process(node, camera, params);
        if(node.visible) {
            this.uniformsProcess(node, camera);
        }

        return process.traverseChildren(node);

    };

    BrowseTree.prototype.uniformsProcess = function()
    {

        var positionWorld = new THREE.Vector3();

        return function(node, camera) {

            node.setMatrixRTC(this.gfxEngine.getRTCMatrixFromCenter(positionWorld.setFromMatrixPosition(node.matrixWorld), camera));
            node.setFog(this.fogDistance);

            this.selectNode(node);

        };

    }();

    BrowseTree.prototype._selectNode = function(node)
    {
        if (node.id === this.selectedNodeId) {
            node.setSelected(node.visible && node.material.visible);
            if (this.selectedNode !== node) {
                this.selectedNode = node;
                //console.info(node);
            }
        }
    };

    /**
     * @documentation: Initiate traverse tree
     * @param {type} tree       : tree
     * @param {type} camera     : current camera
     * @param {type} process    : the process to apply to each node
     * @param {type} optional   : optional process
     * @returns {undefined}
     */
    BrowseTree.prototype.browse = function(tree, camera, process, optional) {

        this.nodeVisible = 0;
        this.tree = tree;

        camera.updateMatrixWorld();

        this.fogDistance = this.mfogDistance * Math.pow((camera.getDistanceFromOrigin() - 6300000) / 25000000, 1.6);

        process.prepare(camera);

        var subdivise = optional === 1;
        var clean = optional === 2;

        var rootNode = tree.children[0];

        for (var i = 0; i < rootNode.children.length; i++)
            this._browse(rootNode.children[i], camera, process, subdivise, clean);


    };

    /**
     * @documentation: Recursive traverse tree
     * @param {type} node       : current node
     * @param {type} camera     : current camera
     * @param {type} process    : the process to apply to each node
     * @param {type} optional   : optional process
     * @returns {undefined}
     */
    BrowseTree.prototype._browse = function(node, camera, process, optional, clean) {

        if (this.processQuadtreeNode(node, camera, process, {withUp : optional, tree : this.tree}))
            for (var i = 0; i < node.children.length; i++)
                this._browse(node.children[i], camera, process, optional,clean);
        else if(clean)
            this._clean(node, node.level + 2, process, camera);

    };

    BrowseTree.prototype._clean = function(node, level, process, camera) {
        if (node.children.length === 0)
            return true;

        var childrenCleaned = 0;
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            // TODO node.wait === true ---> delete child and switch to node.wait = false
            if (this._clean(child, level, process, camera) && ((child.level >= level && child.children.length === 0 && !process.checkSSE(child, camera) /*&& !node.wait*/) /*|| node.level === 2*/))
                childrenCleaned++;
        }

        if (childrenCleaned === node.children.length) {
            node.disposeChildren();
            return true;
        } else
            return false;

    };

     /*
     * @documentation: Recursive traverse tree to update a material specific uniform
     * @returns {undefined}
     */
    BrowseTree.prototype.updateMaterialUniform = function(uniformName, value){


         for(var a = 0; a< this.tree.children.length; ++a ){
             var root = this.tree.children[a];
             for (var c = 0; c < root.children.length; c++) {

               var node = root.children[c];
               var lookMaterial = function(obj) {
                   obj.material.uniforms[uniformName].value = value;
               }.bind(this);
               node.traverse(lookMaterial);
           }
         }
    };

    BrowseTree.prototype.updateNodeMaterial = function(WMTSProvider){

        var loader = new THREE.TextureLoader();
        loader.crossOrigin = '';

        for(var a = 0; a< this.tree.children.length; ++a ){
            var root = this.tree.children[a];
            for (var c = 0; c < root.children.length; c++) {

               var node = root.children[c];

               var lookMaterial = function(obj) {obj.material.Textures[1]
                   // if (obj.material.Textures_01 ){//&& !obj.visible){
                         for (var i=0; i< obj.material.Textures[1].length; ++i){

                              var url = obj.material.Textures[1][i].url;
                              var x,y,z,urlWMTS;
                              if(url){
                                 if(url.indexOf("geoportail")>0){
                                    var indexTILEMATRIX = url.indexOf("TILEMATRIX=");
                                    var indexTILEROW    = url.indexOf("&TILEROW=");
                                    var indexTILECOL    = url.indexOf("&TILECOL=");
                                    z = url.substring(indexTILEMATRIX + 11,indexTILEROW);
                                    x = url.substring(indexTILEROW + 9,indexTILECOL);
                                    y = url.substring(indexTILECOL + 9);
                                    urlWMTS = "http://a.basemaps.cartocdn.com/dark_all/"+z+"/"+y+"/"+x+".png";
                                }else{
                                    var urlArray = url.split("/");
                                    z = urlArray[4];
                                    x = urlArray[5];
                                    y = urlArray[6].split(".")[0];
                                    var coWMTS = {zoom:z, row:y, col:x};
                                    urlWMTS = WMTSProvider.url(coWMTS,'IGNPO');
                                }
                                if( url.indexOf(WMTSProvider.baseUrl) <0){  // We need to update texture
                                    var newTexture = loader.load(urlWMTS);
                                        newTexture.url = urlWMTS;
                                        obj.material.Textures[1][i] = newTexture;
                                }
                             }
                         }
                }.bind(this);
                node.traverse(lookMaterial);
            }
        }
    };

    BrowseTree.prototype.updateLayer = function(layer,camera) {

        if(!layer.visible)
            return;

        var root = layer.children[0];

        for (var c = 0; c < root.children.length; c++) {
            var node = root.children[c];

            this.cachedRTC = this.gfxEngine.getRTCMatrixFromNode(node, camera);

            var cRTC = function(obj) {

                if (obj.material && obj.material.setMatrixRTC)
                    obj.material.setMatrixRTC(this.cachedRTC);

            }.bind(this);

            node.traverse(cRTC);
        }
    };

    BrowseTree.prototype.updateMobileMappingLayer = function(layer,camera) {

        if(!layer.visible)
            return;

        var root = layer.children[0];

        for (var c = 0; c < root.children.length; c++) {

            var node = root.children[c];
            node.setMatrixRTC(this.gfxEngine.getRTCMatrixFromCenter(node.absoluteCenter, camera));

        }
    };

    return BrowseTree;
});
