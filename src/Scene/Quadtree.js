/**
* Generated On: 2015-10-5
* Class: Quadtree
* Description: Structure de données spatiales possedant jusqu'à 4 Nodes
*/

/**
 * 
 * @param {type} Layer
 * @param {type} BoudingBox
 * @returns {Quadtree_L10.Quadtree}
 */
define('Scene/Quadtree',['Scene/Layer','Scene/BoudingBox','when','THREE'], function(Layer,BoudingBox,when,THREE){

    function Quad(bbox)
    {
        this.northWest = new BoudingBox(bbox.minCarto.longitude,bbox.center.x,bbox.center.y,bbox.maxCarto.latitude,bbox.center);
        this.northEast = new BoudingBox(bbox.center.x,bbox.maxCarto.longitude,bbox.center.y,bbox.maxCarto.latitude,bbox.center);
        this.southWest = new BoudingBox(bbox.minCarto.longitude,bbox.center.x,bbox.minCarto.latitude,bbox.center.y,bbox.center);
        this.southEast = new BoudingBox(bbox.center.x,bbox.maxCarto.longitude,bbox.minCarto.latitude,bbox.center.y,bbox.center);
    }
    
    Quad.prototype.array = function()
    {
        var subdiv = [];
        
        subdiv.push(this.northWest);
        subdiv.push(this.northEast);
        subdiv.push(this.southWest);
        subdiv.push(this.southEast);        
        
        return subdiv;
    };

    function Quadtree(tileType,schemeTile){
        
        Layer.call( this);
        
        this.schemeTile       = schemeTile;
        this.tileType         = tileType;
        
        for (var i = 0; i < this.schemeTile.rootCount(); i++)
        {
            this.add(this.createTile(this.schemeTile.getRoot(i)));    
            this.subdivide(this.children[i]);
            this.subdivideChildren(this.children[i]);
        }
                      
        this.addSphere(new THREE.Vector3(1,0,0),0xff0000);
        this.addSphere(new THREE.Vector3(0,1,0),0x00ff00);
        this.addSphere(new THREE.Vector3(0,0,1),0x0000ff);
    }
    
    Quadtree.prototype = Object.create( Layer.prototype );

    Quadtree.prototype.constructor = Quadtree;
    
    Quadtree.prototype.getMesh = function(){
               
        return this.children;
    };
    
    Quadtree.prototype.addSphere = function(vec,col){
               
        var geometry = new THREE.SphereGeometry( 0.05, 32, 32 );
        var material = new THREE.MeshBasicMaterial( {color: col} );
        var sphere = new THREE.Mesh( geometry, material );
        sphere.position.set(vec.x,vec.y,vec.z);
        this.add(sphere);
    };
    
    
    Quadtree.prototype.northWest = function(node)
    {
        return node.children[0];
    };
    
    Quadtree.prototype.northEast = function(node)
    {
        return node.children[1];
    };
    
    Quadtree.prototype.southWest = function(node)
    {
        return node.children[2];
    };
    
    Quadtree.prototype.southEast = function(node)
    {
        return node.children[3];
    };    
    
    Quadtree.prototype.createTile = function(bbox)
    {
        var cooWMTS = this.projection.WGS84toWMTS(bbox);       
        
        var tile    = new this.tileType(bbox);
        //tile.position.set(tile.bbox.relativeCenter.x,tile.bbox.relativeCenter.y,0);        
        tile.level  = cooWMTS.zoom;
        
        this.interCommand.getTile(cooWMTS).then(function(texture)
        {   
            this.setTexture(texture);             

        }.bind(tile)); 
        
        return tile;
    };    
        
   /**
    * return 4 equals subdivisions of the bouding box
    * @param {type} node
    * @returns {Array} four bounding box
    */
    Quadtree.prototype.subdivide = function(node)
    {
        var quad = new Quad(node.bbox);
        /*
        return when.all([        
        node.add(this.createTile(quad.northWest)),
        node.add(this.createTile(quad.northEast)),
        node.add(this.createTile(quad.southWest)),
        node.add(this.createTile(quad.southEast))]).then(function()
        {
            node.material.visible = false;
        });
        */
       
        node.add(this.createTile(quad.northWest));
        node.add(this.createTile(quad.northEast));
        node.add(this.createTile(quad.southWest));
        node.add(this.createTile(quad.southEast));
          
        node.material.visible = false;
    };
    
    Quadtree.prototype.subdivideChildren = function(node)
    {
        for (var i = 0 ;i<node.children.length;i++)
            this.subdivide(node.children[i]);
    };
    
    
   
    return Quadtree;

});