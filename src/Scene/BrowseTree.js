/**
* Generated On: 2015-10-5
* Class: BrowseTree
* Description: BrowseTree parcourt un arbre de Node. Lors du parcours un ou plusieur NodeProcess peut etre appliqué sur certains Node.
*/

define('Scene/BrowseTree',['Globe/EllipsoidTileMesh','THREE','OBBHelper'], function(EllipsoidTileMesh,THREE,OBBHelper){

    function BrowseTree(){
        //Constructor

        this.process    = null;        
        this.root       = undefined;
        this.oneNode    = 0;
        this.node        = undefined;
        this.camera     = undefined;
        this.frustum    = new THREE.Frustum();
    }
        
    BrowseTree.prototype.backFaceCulling = function(node,camera)
    {
        var normal  = camera.direction;
        for(var n = 0; n < node.normals().length; n ++ ) 
        {
            
            var dot = normal.dot(node.normals()[n]);
            if( dot > 0 )
            {
                node.visible    = true;                
                return true;
            }
        };
        
        return node.visible;
              
    };
    
    BrowseTree.prototype.frustumCulling = function(node,camera)
    {        
        var frustum = camera.frustum;
        
        return frustum.intersectsObject(node);   
    };
    
    BrowseTree.prototype.SSE = function(node,camera)
    {                                
        return camera.SSE(node) > 1.0;            
    };
    
    BrowseTree.prototype.frustumCullingOO = function(node,camera)        
    {        
        var obb     = node.geometry.OBB;
        var quadInv = obb.quadInverse().clone();            

        this.camera.position.copy(obb.worldToLocal(camera.position().clone()));
        this.camera.quaternion.copy(quadInv.multiply(camera.camera3D.quaternion));

        this.camera.updateMatrix(); 
        this.camera.updateMatrixWorld(); 
        this.camera.matrixWorldInverse.getInverse( this.camera.matrixWorld );
        this.frustum.setFromMatrix( new THREE.Matrix4().multiplyMatrices( this.camera.projectionMatrix, this.camera.matrixWorldInverse));             
 
        node.visible = this.frustum.intersectsBox(obb.box3D);
        
        return node.visible;
        
    };
    
    BrowseTree.prototype.processNode = function(node,camera)
    {
        if(this.node !== undefined)        
            this.frustumCullingOO(this.node,camera);
        
        
        if(node instanceof EllipsoidTileMesh)
        {
            
            node.visible = false;
            
            this.backFaceCulling(node,camera);
            
            if(node.visible)
                this.frustumCullingOO(node,camera);          
                 
                                                
            return node.visible;
        }        
        
        return true;
    };

    /**
     * 
     * @param {type} tree
     * @param {type} camera
     * @returns {undefined}
     */
    BrowseTree.prototype.browse = function(tree, camera){
             
        this.root = tree;
        this.camera = camera.camera3D.clone();
        //if(this.processNode(tree,camera))       
        for(var i = 0;i<tree.children.length;i++)
            this._browse(tree.children[i],camera);

    };
    
    BrowseTree.prototype._browse = function(node, camera){
             
        if(this.processNode(node,camera))       
            for(var i = 0;i<node.children.length;i++)
                this._browse(node.children[i],camera);

    };
    
    BrowseTree.prototype.bBoxHelper = function(node,parent)
    {          
        if(node instanceof EllipsoidTileMesh && node.level < 6  && node.noChild())
        {            
            if(parent !== undefined && this.oneNode === 8)
            {                    
                parent.add(new THREE.OBBHelper(node.geometry.OBB));
                                
            }
            this.oneNode++;
        }
        else
            return parent;

    };
    
    BrowseTree.prototype.addBBoxHelper = function(node,parent){
             
        var bboxH = this.bBoxHelper(node,parent);
            
        for(var i = 0;i<node.children.length;i++)
                this.addBBoxHelper(node.children[i],parent);
            
        return bboxH;

    };
    
    return BrowseTree;
});