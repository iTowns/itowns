/**
* Generated On: 2015-10-5
* Class: BrowseTree
* Description: BrowseTree parcourt un arbre de Node. Lors du parcours un ou plusieur NodeProcess peut etre appliqué sur certains Node.
*/

define('Scene/BrowseTree',['THREE','Globe/EllipsoidTileMesh','Scene/NodeProcess','OBBHelper'], function(THREE,EllipsoidTileMesh){

    function BrowseTree(scene){
        //Constructor
  
        this.oneNode    = 0;
        this.scene      = scene;        
        this.nodeProcess= undefined;
        this.tree       = undefined;
        this.date       = new Date();          

    }
    
    /**
     * 
     * @param {type} node
     * @returns {undefined}
     */
    BrowseTree.prototype.invisible= function(node)
    {        
        node.visible = false;
    };
    
    BrowseTree.prototype.addNodeProcess= function(nodeProcess)
    {        
        this.nodeProcess = nodeProcess;
    };
    
    BrowseTree.prototype.NodeProcess= function()
    {        
        return this.nodeProcess;
    };
   
    /**
     * @documentation: Process to apply to each node
     * @param {type} node   : node current to apply process
     * @param {type} camera : current camera needed to process
     * @param {type} optional  : optional process
     * @returns {Boolean}
     */
    BrowseTree.prototype.processNode = function(node,camera,optional)
    {        
        if(node instanceof EllipsoidTileMesh)
        {            
            node.visible = false;
            
            if(node.loaded)
            {
                this.nodeProcess.frustumCullingOBB(node,camera);

                if(node.visible )
                {
                    this.nodeProcess.horizonCulling(node,camera);

                    if(node.visible )
                    {

                        if(node.parent.material !== undefined && node.parent.material.visible === true)
                        {                                     
                            node.visible = false;
                            if (node.timeInvisible === 0)
                            {
                                node.timeInvisible = new Date().getTime();
                                //console.log(node.timeInvisible);
                            }
                            return false;
                        }

                        var sse = this.nodeProcess.SSE(node,camera);

                        if(optional && sse && node.material.visible === true && node.wait === false)
                        {   
                            //console.log(node.sse);
                            this.tree.subdivide(node);
                        }                            
                        else if(!sse && node.level >= 2 && node.material.visible === false && node.wait === false)
                        {

                            node.material.visible = true;
                                            
                            this.RTC(node,camera);

                            if(node.childrenCount() !== 0)
                                for(var i = 0;i<node.children.length;i++)
                                {                                                       
                                    node.children[i].visible = false;                                        
                                }

                            return false;                            
                        }                                
                    }
                }
            }

            if(node.visible)
            {
                this.RTC(node,camera);
                node.timeInvisible = 0;
            }
            else if (node.timeInvisible === 0)
            {
                
                node.timeInvisible = new Date().getTime();
                //console.log(node.timeInvisible);
            }
                                        
            return node.visible;
        }        
        
        return true;
    };
    
    
    BrowseTree.prototype.RTC = function(node,camera)
    {        
//        var matrixWorld     = new THREE.Matrix4();        
//        var modelViewMatrix = new THREE.Matrix4().multiplyMatrices(camera.viewMatrix(),matrixWorld);           
//        var center          = node.absoluteCenter;
//        var centerEye       = new THREE.Vector4(center.x,center.y,center.z, 1.0).applyMatrix4(camera.viewMatrix()) ;        
//        var mvc             = modelViewMatrix.clone().setPosition(centerEye);        
//        var mVPMatRTC       = new THREE.Matrix4().multiplyMatrices(camera.camera3D.projectionMatrix,mvc);
//        
        camera = camera.camera3D;
        var center          = new THREE.Vector3();
        //var matrixWorld     = new THREE.Matrix4();
        
        var matrixWorld     = node.matrixWorld;

        var cameraMatrixWorld           = camera.matrixWorld;

        var cameraWorldPosition         = new THREE.Vector3().setFromMatrixPosition(cameraMatrixWorld);

        var positionCameraNode          = new THREE.Vector3().subVectors(cameraWorldPosition,node.absoluteCenter);

        var cameraMatrixWorldCentered   = camera.matrixWorld.clone().setPosition(positionCameraNode);

        var cameraMatrixWorldInverse    = new THREE.Matrix4();

        cameraMatrixWorldInverse.getInverse(cameraMatrixWorldCentered);

        var modelViewMatrix = new THREE.Matrix4().multiplyMatrices(cameraMatrixWorldInverse,matrixWorld);           

        var centerEye       = new THREE.Vector4(center.x,center.y,center.z, 1.0).applyMatrix4(cameraMatrixWorldInverse) ;                        

        var mvc             = modelViewMatrix.clone().setPosition(centerEye);        
        var mVPMatRTC       = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,mvc);
        
        node.tMat.uniforms.mVPMatRTC.value = mVPMatRTC;

    };
    /**
     * @documentation: Initiate traverse tree 
     * @param {type} tree       : tree 
     * @param {type} camera     : current camera
     * @param {type} optional   : optional process
     * @returns {undefined}
     */
    BrowseTree.prototype.browse = function(tree, camera,optional){
 
        this.tree = tree;
        this.nodeProcess.preHorizonCulling(camera);
        for(var i = 0;i<tree.children.length;i++)
            this._browse(tree.children[i],camera,optional);
    };
    
    /**
     * @documentation: Recursive traverse tree
     * @param {type} node       : current node     
     * @param {type} camera     : current camera
     * @param {type} optional   : optional process
     * @returns {undefined}
     */
    BrowseTree.prototype._browse = function(node, camera,optional){
             
        //this.bBoxHelper(node);
        if(this.processNode(node,camera,optional))       
            for(var i = 0;i<node.children.length;i++)
                this._browse(node.children[i],camera,optional);
//        else
//            this._clean(node,node.level +2);

    };
    
    BrowseTree.prototype._clean = function(node,level)
    {
        if( node.children.length === 0)
            return true;
        
        var childrenCleaned = 0;
        for(var i = 0;i<node.children.length;i++)
        {
            var child = node.children[i];
            
            //console.log(this.date.getTime() - child.timeInvisible);
            if(this._clean(child,level) && (new Date().getTime() - child.timeInvisible) > 2000 && child.level > 2 && child.level >= level && child.children.length ===0)
                childrenCleaned++;                        
        }
        
        if(childrenCleaned === 4 )
        {            
            
            while(node.children.length>0)
            {
                var child = node.children[0];
                node.remove(child);
                child.dispose();                
                this.tree.nbNodes--;
            }
            node.material.visible = true;
            return true;
        }else         
            return false;
        
    };
    
    /**
     * TODO : to delete
     * @documentation:add oriented bouding box of node in scene
     * @param {type} node
     * @returns {undefined}
     */
    BrowseTree.prototype.bBoxHelper = function(node)
    {          
        if(node instanceof EllipsoidTileMesh && node.level === 2  )
        {                
            
            //console.log(node);
            if(this.oneNode === 22 )
            {                    
                var obb = new THREE.OBBHelper(node.geometry.OBB);
                var l       = node.absoluteCenter.length();
                obb.translateZ(l);
                this.scene.scene3D().add(obb);           
            }
            this.oneNode++;
        }
    };
    
    /**
     * TODO : to delete 
     * @param {type} node
     * @returns {BrowseTree_L7.BrowseTree.prototype.addOBBoxHelper.bboxH}
     */
    BrowseTree.prototype.addOBBoxHelper = function(node){
             
        var bboxH = this.bBoxHelper(node);
            
        for(var i = 0;i<node.children.length;i++)
                this.addOBBoxHelper(node.children[i]);
            
        return bboxH;

    };
    
    return BrowseTree;
});