/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

define('Core/Geographic/Quad',['Scene/BoudingBox'], function(BoudingBox)
{
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
    
    return Quad;
    
});
