/**
* Generated On: 2016-01-20
* Class: KML_Provider
* Description: Parseur de KML jusqu'à obtention du collada
*/


define('Core/Commander/Providers/KML_Provider',[
            'Core/Commander/Providers/Provider',
            'Core/Commander/Providers/IoDriverXML',
            'when',
            'THREE',
            'Scene/BoudingBox',
            'Renderer/ThreeExtented/KMZLoader'], 
        function(
                Provider,
                IoDriverXML,
                when,
                THREE,                
                BoudingBox,
                KMZLoader
                ){


    function KML_Provider()
    {
        //Constructor
        
        this.ioDriverXML = new IoDriverXML();
        this.kmzLoader   = new KMZLoader();                      
  }

    KML_Provider.prototype = Object.create( Provider.prototype );

    KML_Provider.prototype.constructor = KML_Provider;
    
    
    KML_Provider.prototype.loadTestCollada = function()
    {   
        
        return this.getUrlCollada(48.88, 48.875, -3.4900000000000047, -3.4950000000000045).then(function(result){
            
               return result;

        }.bind(this)); 
       
    };
         
    
    KML_Provider.prototype.parseKML = function(urlFile/*, north, south, east, west*/)
    {  
        
        var north = 48.87;
        var south = 48.875;
        var east = -3.4900000000000046;
        var west = -3.4940000000000044;
        var key = 'j2bfkv9whnqpq04zpzlfz2ge'; 
        var url = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'FXX/';
        return this.ioDriverXML.read(urlFile).then(function(result)
        {
            //console.log(result);

            var kml = [];                    
            kml = result.getElementsByTagName("href");
            //console.log(kml.length);
            
            for (i=0; i<kml.length; i++){
                
                var url_href = [];
                url_href[i] = url + "TREE/" + kml[i].childNodes[0].nodeValue.replace("../", "");
                //console.log(url_href[i]);
                
                //get tile's coords
                var coords = [];
                coords[i,1] = result.getElementsByTagName("north")[i].childNodes[0].nodeValue;
                coords[i,2] = result.getElementsByTagName("south")[i].childNodes[0].nodeValue;
                coords[i,3] = result.getElementsByTagName("east")[i].childNodes[0].nodeValue;
                coords[i,4] = result.getElementsByTagName("west")[i].childNodes[0].nodeValue;
                //console.log(coords[i,1], coords[i,2], coords[i,3], coords[i,4]);
                
                //get min and max LodPixel of each tile
                /*var min_max_2 = [];
                min_max_2[j,1] = result_1.getElementsByTagName("minLodPixels")[j].childNodes[0].nodeValue;
                min_max_2[j,2] = result_1.getElementsByTagName("maxLodPixels")[j].childNodes[0].nodeValue;
                console.log("minLodPixels = " + min_max_2[j,1] + "; maxLodPixels = " + min_max_2[j,2]);*/ 

                //Next level : Get the next KML actual position's coords
                if ( url_href[i].toLowerCase().substr( - 4 ) ===  '.kml' && north < coords[i,1] && south > coords[i,2]  && east < coords[i,3] && west > coords[i,4]){                    
                    //console.log(coords[i,1], coords[i,2], coords[i,3], coords[i,4]);
                    //console.log(url_href[i].toLowerCase().substr( - 4 ));
                    //sssconsole.log(url_href[i]);
                    return this.parseKML(url_href[i]);
                    
                }
                //Next level : Get the next KMZ actual position's coords
                else if (url_href[i].toLowerCase().substr( - 4 ) ===  '.kmz'){

                    var url_href_kmz = [];
                    url_href_kmz[i] = url + kml[i].childNodes[0].nodeValue.replace("../../", "");
                    //console.log(url_href_kmz[i]);
                    
                    return this.kmzLoader.load(url_href_kmz[i]);
                }
            }
            
        }.bind(this));

    };
 
    KML_Provider.prototype.getUrlCollada = function(north, south, east, west)
    {
       
        var deferred = when.defer();
        //var url = 'http://wxs.ign.fr/va5orxd0pgzvq3jxutqfuy0b/vecteurtuile3d/BATI3D/BU.Building.kml';
        
        this.ioDriverXML.read('http://wxs.ign.fr/j2bfkv9whnqpq04zpzlfz2ge/vecteurtuile3d/BATI3D/BU.Building.kml').then(function(result_0)
        {
            
            // get href's node value
            var kml_0 = result_0.getElementsByTagName("href");
            var url_href_1;// = [];
            var key = 'j2bfkv9whnqpq04zpzlfz2ge';


            //for (i=0; i<kml_0.length; i++){
              //  url_href_1[i] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + kml_0[i].childNodes[0].nodeValue.replace("./", "");
                url_href_1 = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/FXX/TREE/0/0_000_000.kml';
                //console.log(url_href_1[i]);   
                this.parseKML(url_href_1).then(function(result)
                {
 
                    deferred.resolve(result);
                    
                });
                
                
            //Couper ici pour récupérer algo    
            //}
            
        }.bind(this));
        
        return deferred;
    }; 
    
    return KML_Provider;
    
});  
                
                
                
                
                //If France
//                if (url_href_1[i] === 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/FXX/TREE/0/0_000_000.kml'){
//                    //this.ParseKML(url_href_1[i]);
//                    //console.log("wesh");
//                    this.ioDriverXML.read(url_href_1[i]).then(function(result_1)
//                    {
//                        var kml_1 = [];                    
//                        kml_1 = result_1.getElementsByTagName("href");
//                        //console.log(kml_1.length);
//
//                        for (j=0; j<kml_1.length; j++){   
//
//                            var url_href_2 = [];
//                            url_href_2[j] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'FXX' + "/TREE/" + kml_1[j].childNodes[0].nodeValue.replace("../", "");
//                            //console.log(url_href_2[j]);
//                            
//                            //get tile's coords
//                            var coords_2 = [];
//                            coords_2[j,1] = result_1.getElementsByTagName("north")[j].childNodes[0].nodeValue;
//                            coords_2[j,2] = result_1.getElementsByTagName("south")[j].childNodes[0].nodeValue;
//                            coords_2[j,3] = result_1.getElementsByTagName("east")[j].childNodes[0].nodeValue;
//                            coords_2[j,4] = result_1.getElementsByTagName("west")[j].childNodes[0].nodeValue;
//                            
//                            //get min and max LodPixel of each tile
//                            /*var min_max_2 = [];
//                            min_max_2[j,1] = result_1.getElementsByTagName("minLodPixels")[j].childNodes[0].nodeValue;
//                            min_max_2[j,2] = result_1.getElementsByTagName("maxLodPixels")[j].childNodes[0].nodeValue;
//                            console.log("minLodPixels = " + min_max_2[j,1] + "; maxLodPixels = " + min_max_2[j,2]);*/                  
//                            
//                            //Next level : Get the next KML actual position's coords
//                            //this.ParseKML(url_href_2[j]/*, coords_2[j,1], coords_2[j,2], coords_2[j,3], coords_2[j,4]*/);
//                            if (north < coords_2[j,1] && south > coords_2[j,2]  && east < coords_2[j,3] && west > coords_2[j,4]){
//                                //this.ParseKML(url_href_2[j]);
//                                
//                                this.ioDriverXML.read(url_href_2[j]).then(function(result_2){
//
//                                    var kml_2 = [];
//                                    kml_2 = result_2.getElementsByTagName("href");
//
//                                    for (k=0; k<kml_2.length; k++){
//                                        var url_href_3 = [];
//                                        url_href_3[k] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'FXX' + "/TREE/" + kml_2[k].childNodes[0].nodeValue.replace("../", "");
//                                        //console.log(url_href_3[k]);
//                                        
//                                        var coords_3 = [];
//                                        coords_3[k,1] = result_1.getElementsByTagName("north")[k].childNodes[0].nodeValue;
//                                        coords_3[k,2] = result_1.getElementsByTagName("south")[k].childNodes[0].nodeValue;
//                                        coords_3[k,3] = result_1.getElementsByTagName("east")[k].childNodes[0].nodeValue;
//                                        coords_3[k,4] = result_1.getElementsByTagName("west")[k].childNodes[0].nodeValue;
//                                        
//                                        //Next Level : Get the next KML actual position's coords
//                                        if (north < coords_3[k,1] && south > coords_3[k,2]  && east < coords_3[k,3] && west > coords_3[k,4]){
//
//                                            this.ioDriverXML.read(url_href_3[k]).then(function(result_3){
//
//                                                var kml_3 = [];
//                                                kml_3 = result_3.getElementsByTagName("href");
//
//                                                for (l=0; l<kml_3.length; l++){
//                                                    var url_href_4 = [];
//                                                    url_href_4[l] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'FXX' + "/TREE/" + kml_3[l].childNodes[0].nodeValue.replace("../", "");
//                                                    //console.log(url_href_4[l]);
//                                                    
//                                                    var coords_4 = [];
//                                                    coords_4[l,1] = result_1.getElementsByTagName("north")[l].childNodes[0].nodeValue;
//                                                    coords_4[l,2] = result_1.getElementsByTagName("south")[l].childNodes[0].nodeValue;
//                                                    coords_4[l,3] = result_1.getElementsByTagName("east")[l].childNodes[0].nodeValue;
//                                                    coords_4[l,4] = result_1.getElementsByTagName("west")[l].childNodes[0].nodeValue;
//                                                    
//                                                    //Next Level : Get the KMZ actual position's coords
//                                                    if (north < coords_4[l,1] && south > coords_4[l,2]  && east < coords_4[l,3] && west > coords_4[l,4]){
//                                                        
//                                                        this.ioDriverXML.read(url_href_4[l]).then(function(result_4){
//
//                                                            var kml_4 = [];
//                                                            kml_4 = result_4.getElementsByTagName("href");
//                                                            
//                                                            //Get KMZ
//                                                            for (m=0; m<kml_4.length; m++){
//                                                                var url_href_kmz = [];
//                                                                url_href_kmz[m] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'FXX/' + kml_4[m].childNodes[0].nodeValue.replace("../../", "");
//                                                                //console.log(url_href_kmz[m]);
//                                                                
//                                                                /*this.ioDriverXML = new IoDriverXML();
//                                                                var KMZLoader = new THREE.KMZLoader();
//                                                                this.ioDriverXML.read(KMZLoader.load(url_href_kmz[m])).then(function(result_5){
//                                                                    console.log(result_5);
//                                                                });*/
//                                                                
//                                                                //var col =  KMZLoader.parse("file/" + KMZLoader.load(url_href_kmz[m]));
//                                                                var kmz = [];
//                                                                return this.KMZLoader.load(url_href_kmz[m]).then(function(result){
//                                                                    
//                                                                        deferred.resolve(result);
//                                                                        //return result;
//                                                                }.bind(this));
//                                                                
//                                                                //var kmz += "file/" + kmz;
//                                                                
//                                                                //var kmz_2 = KMZLoader.parse(url_href_kmz[m]);
//                                                                //console.log(kmz_2);
//                                                                
//                                                                //return kmz[m];
//                                                            }
//                                                            //console.log(url_href_kmz.length);
//                                                        }.bind(this));
//                                                    }
//
//                                                }
//
//                                            }.bind(this));
//                                        }
//                                    }
//
//                                }.bind(this));
//                            }
//
//                        }    
//
//                    }.bind(this));
//                    
//                }           
//            }
//            
//        }.bind(this));
//        
//        return deferred;
//    }; 
//    
//    return KML_Provider;
//    
//});

/*
 //If Guadeloupe
                if (url_href_1[i] === 'http://wxs.ign.fr/j2bfkv9whnqpq04zpzlfz2ge/vecteurtuile3d/BATI3D/GLP/TREE/0/0_00_00.kml'){
                    
                    this.ioDriverXML = new IoDriverXML();
                    this.ioDriverXML.read(url_href_1[i]).then(function(result_1)
                    {

                        var kml_1 = [];                    
                        kml_1 = result_1.getElementsByTagName("href");
                        //console.log(kml_1.length);

                        for (j=0; j<kml_1.length; j++){   

                            var url_href_2 = [];
                            url_href_2[j] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'GLP' + "/TREE/" + kml_1[j].childNodes[0].nodeValue.replace("../", "");
                            //console.log(url_href_2[j]);
                            
                            //get tile's coords
                            var coords_2 = [];
                            coords_2[j,1] = result_1.getElementsByTagName("north")[j].childNodes[0].nodeValue;
                            coords_2[j,2] = result_1.getElementsByTagName("south")[j].childNodes[0].nodeValue;
                            coords_2[j,3] = result_1.getElementsByTagName("east")[j].childNodes[0].nodeValue;
                            coords_2[j,4] = result_1.getElementsByTagName("west")[j].childNodes[0].nodeValue;
                            //console.log(coords_2[j,1] + coords_2[j,2] + coords_2[j,3] + coords_2[j,4]);

                            //get min and max LodPixel of each tile
                            //var min_max_2 = [];
                            //min_max_2[j,1] = result_1.getElementsByTagName("minLodPixels")[j].childNodes[0].nodeValue;
                            //min_max_2[j,2] = result_1.getElementsByTagName("maxLodPixels")[j].childNodes[0].nodeValue;
                            //console.log("minLodPixels = " + min_max_2[j,1] + "; maxLodPixels = " + min_max_2[j,2]);                 
                            
                            //Next level : Get the next KML actual position's coords
                            if (north < coords_2[j,1] && south > coords_2[j,2]  && east < coords_2[j,3] && west > coords_2[j,4]){
                                this.ioDriverXML = new IoDriverXML();
                                this.ioDriverXML.read(url_href_2[j]).then(function(result_2){
                                    
                                    var kml_2 = [];
                                    kml_2 = result_2.getElementsByTagName("href");

                                    for (k=0; k<kml_2.length; k++){
                                        var url_href_3 = [];
                                        url_href_3[k] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'GLP' + "/TREE/" + kml_2[k].childNodes[0].nodeValue.replace("../", "");
                                        //console.log(url_href_3[k]);
                                        
                                        var coords_3 = [];
                                        coords_3[k,1] = result_1.getElementsByTagName("north")[k].childNodes[0].nodeValue;
                                        coords_3[k,2] = result_1.getElementsByTagName("south")[k].childNodes[0].nodeValue;
                                        coords_3[k,3] = result_1.getElementsByTagName("east")[k].childNodes[0].nodeValue;
                                        coords_3[k,4] = result_1.getElementsByTagName("west")[k].childNodes[0].nodeValue;
                                        
                                        //Next Level : Get the next KML actual position's coords
                                        if (north < coords_3[k,1] && south > coords_3[k,2]  && east < coords_3[k,3] && west > coords_3[k,4]){
                                            this.ioDriverXML_3 = new IoDriverXML();
                                            this.ioDriverXML_3.read(url_href_3[k]).then(function(result_3){

                                                var kml_3 = [];
                                                kml_3 = result_3.getElementsByTagName("href");

                                                for (l=0; l<kml_3.length; l++){
                                                    var url_href_4 = [];
                                                    url_href_4[l] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'GLP' + "/" + kml_3[l].childNodes[0].nodeValue.replace("../../", "");
                                                    console.log(url_href_4[l]);
                                                    
                                                    var coords_4 = [];
                                                    coords_4[l,1] = result_1.getElementsByTagName("north")[l].childNodes[0].nodeValue;
                                                    coords_4[l,2] = result_1.getElementsByTagName("south")[l].childNodes[0].nodeValue;
                                                    coords_4[l,3] = result_1.getElementsByTagName("east")[l].childNodes[0].nodeValue;
                                                    coords_4[l,4] = result_1.getElementsByTagName("west")[l].childNodes[0].nodeValue;

                                                }

                                            });
                                        }
                                    }

                                });
                            }

                        }    

                    });
                    
                }
                
                //If Guyane
                if (url_href_1[i] === 'http://wxs.ign.fr/j2bfkv9whnqpq04zpzlfz2ge/vecteurtuile3d/BATI3D/GUF/TREE/0/0_00_00.kml'){
                    
                    this.ioDriverXML = new IoDriverXML();
                    this.ioDriverXML.read(url_href_1[i]).then(function(result_1)
                    {

                        var kml_1 = [];                    
                        kml_1 = result_1.getElementsByTagName("href");
                        //console.log(kml_1.length);

                        for (j=0; j<kml_1.length; j++){   

                            var url_href_2 = [];
                            url_href_2[j] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'GUF' + "/TREE/" + kml_1[j].childNodes[0].nodeValue.replace("../", "");
                            //console.log(url_href_2[j]);
                            
                            //get tile's coords
                            var coords_2 = [];
                            coords_2[j,1] = result_1.getElementsByTagName("north")[j].childNodes[0].nodeValue;
                            coords_2[j,2] = result_1.getElementsByTagName("south")[j].childNodes[0].nodeValue;
                            coords_2[j,3] = result_1.getElementsByTagName("east")[j].childNodes[0].nodeValue;
                            coords_2[j,4] = result_1.getElementsByTagName("west")[j].childNodes[0].nodeValue;
                            //console.log(coords_2[j,1] + coords_2[j,2] + coords_2[j,3] + coords_2[j,4]);

                            //get min and max LodPixel of each tile
                            //var min_max_2 = [];
                            //min_max_2[j,1] = result_1.getElementsByTagName("minLodPixels")[j].childNodes[0].nodeValue;
                            //min_max_2[j,2] = result_1.getElementsByTagName("maxLodPixels")[j].childNodes[0].nodeValue;
                            //console.log("minLodPixels = " + min_max_2[j,1] + "; maxLodPixels = " + min_max_2[j,2]);                 
                            
                            //Next level : Get the next KML actual position's coords
                            if (north < coords_2[j,1] && south > coords_2[j,2]  && east < coords_2[j,3] && west > coords_2[j,4]){
                                this.ioDriverXML = new IoDriverXML();
                                this.ioDriverXML.read(url_href_2[j]).then(function(result_2){
                                    
                                    var kml_2 = [];
                                    kml_2 = result_2.getElementsByTagName("href");

                                    for (k=0; k<kml_2.length; k++){
                                        var url_href_3 = [];
                                        url_href_3[k] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'GUF' + "/TREE/" + kml_2[k].childNodes[0].nodeValue.replace("../", "");
                                        //console.log(url_href_3[k]);
                                        
                                        var coords_3 = [];
                                        coords_3[k,1] = result_1.getElementsByTagName("north")[k].childNodes[0].nodeValue;
                                        coords_3[k,2] = result_1.getElementsByTagName("south")[k].childNodes[0].nodeValue;
                                        coords_3[k,3] = result_1.getElementsByTagName("east")[k].childNodes[0].nodeValue;
                                        coords_3[k,4] = result_1.getElementsByTagName("west")[k].childNodes[0].nodeValue;
                                        
                                        //Next Level : Get the next KML actual position's coords
                                        if (north < coords_3[k,1] && south > coords_3[k,2]  && east < coords_3[k,3] && west > coords_3[k,4]){
                                            this.ioDriverXML_3 = new IoDriverXML();
                                            this.ioDriverXML_3.read(url_href_3[k]).then(function(result_3){

                                                var kml_3 = [];
                                                kml_3 = result_3.getElementsByTagName("href");

                                                for (l=0; l<kml_3.length; l++){
                                                    var url_href_4 = [];
                                                    url_href_4[l] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'GUF' + "/" + kml_3[l].childNodes[0].nodeValue.replace("../../", "");
                                                    //console.log(url_href_4[l]);
                                                    
                                                    var coords_4 = [];
                                                    coords_4[l,1] = result_1.getElementsByTagName("north")[l].childNodes[0].nodeValue;
                                                    coords_4[l,2] = result_1.getElementsByTagName("south")[l].childNodes[0].nodeValue;
                                                    coords_4[l,3] = result_1.getElementsByTagName("east")[l].childNodes[0].nodeValue;
                                                    coords_4[l,4] = result_1.getElementsByTagName("west")[l].childNodes[0].nodeValue;

                                                }

                                            });
                                        }
                                    }

                                });
                            }

                        }    

                    });
                    
                }
                
                //If Martinique
                if (url_href_1[i] === 'http://wxs.ign.fr/j2bfkv9whnqpq04zpzlfz2ge/vecteurtuile3d/BATI3D/MTQ/TREE/0/0_00_00.kml'){
                    
                    this.ioDriverXML = new IoDriverXML();
                    this.ioDriverXML.read(url_href_1[i]).then(function(result_1)
                    {

                        var kml_1 = [];                    
                        kml_1 = result_1.getElementsByTagName("href");
                        //console.log(kml_1.length);

                        for (j=0; j<kml_1.length; j++){   

                            var url_href_2 = [];
                            url_href_2[j] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'MTQ' + "/TREE/" + kml_1[j].childNodes[0].nodeValue.replace("../", "");
                            //console.log(url_href_2[j]);
                            
                            //get tile's coords
                            var coords_2 = [];
                            coords_2[j,1] = result_1.getElementsByTagName("north")[j].childNodes[0].nodeValue;
                            coords_2[j,2] = result_1.getElementsByTagName("south")[j].childNodes[0].nodeValue;
                            coords_2[j,3] = result_1.getElementsByTagName("east")[j].childNodes[0].nodeValue;
                            coords_2[j,4] = result_1.getElementsByTagName("west")[j].childNodes[0].nodeValue;
                            //console.log(coords_2[j,1] + coords_2[j,2] + coords_2[j,3] + coords_2[j,4]);

                            //get min and max LodPixel of each tile
                            //var min_max_2 = [];
                            //min_max_2[j,1] = result_1.getElementsByTagName("minLodPixels")[j].childNodes[0].nodeValue;
                            //min_max_2[j,2] = result_1.getElementsByTagName("maxLodPixels")[j].childNodes[0].nodeValue;
                            //console.log("minLodPixels = " + min_max_2[j,1] + "; maxLodPixels = " + min_max_2[j,2]);                 
                            
                            //Next level : Get the next KML actual position's coords
                            if (north < coords_2[j,1] && south > coords_2[j,2]  && east < coords_2[j,3] && west > coords_2[j,4]){
                                this.ioDriverXML = new IoDriverXML();
                                this.ioDriverXML.read(url_href_2[j]).then(function(result_2){
                                    
                                    var kml_2 = [];
                                    kml_2 = result_2.getElementsByTagName("href");

                                    for (k=0; k<kml_2.length; k++){
                                        var url_href_3 = [];
                                        url_href_3[k] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'MTQ' + "/TREE/" + kml_2[k].childNodes[0].nodeValue.replace("../", "");
                                        //console.log(url_href_3[k]);
                                        
                                        var coords_3 = [];
                                        coords_3[k,1] = result_1.getElementsByTagName("north")[k].childNodes[0].nodeValue;
                                        coords_3[k,2] = result_1.getElementsByTagName("south")[k].childNodes[0].nodeValue;
                                        coords_3[k,3] = result_1.getElementsByTagName("east")[k].childNodes[0].nodeValue;
                                        coords_3[k,4] = result_1.getElementsByTagName("west")[k].childNodes[0].nodeValue;
                                        
                                        //Next Level : Get the next KML actual position's coords
                                        if (north < coords_3[k,1] && south > coords_3[k,2]  && east < coords_3[k,3] && west > coords_3[k,4]){
                                            this.ioDriverXML_3 = new IoDriverXML();
                                            this.ioDriverXML_3.read(url_href_3[k]).then(function(result_3){

                                                var kml_3 = [];
                                                kml_3 = result_3.getElementsByTagName("href");

                                                for (l=0; l<kml_3.length; l++){
                                                    var url_href_4 = [];
                                                    url_href_4[l] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'MTQ' + "/" + kml_3[l].childNodes[0].nodeValue.replace("../../", "");
                                                    //console.log(url_href_4[l]);
                                                    
                                                    var coords_4 = [];
                                                    coords_4[l,1] = result_1.getElementsByTagName("north")[l].childNodes[0].nodeValue;
                                                    coords_4[l,2] = result_1.getElementsByTagName("south")[l].childNodes[0].nodeValue;
                                                    coords_4[l,3] = result_1.getElementsByTagName("east")[l].childNodes[0].nodeValue;
                                                    coords_4[l,4] = result_1.getElementsByTagName("west")[l].childNodes[0].nodeValue;

                                                }

                                            });
                                        }
                                    }

                                });
                            }

                        }    

                    });
                    
                }
                
                //If Réunion
                if (url_href_1[i] === 'http://wxs.ign.fr/j2bfkv9whnqpq04zpzlfz2ge/vecteurtuile3d/BATI3D/REU/TREE/0/0_00_00.kml'){
                    
                    this.ioDriverXML = new IoDriverXML();
                    this.ioDriverXML.read(url_href_1[i]).then(function(result_1)
                    {

                        var kml_1 = [];                    
                        kml_1 = result_1.getElementsByTagName("href");
                        //console.log(kml_1.length);

                        for (j=0; j<kml_1.length; j++){   

                            var url_href_2 = [];
                            url_href_2[j] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'REU' + "/TREE/" + kml_1[j].childNodes[0].nodeValue.replace("../", "");
                            //console.log(url_href_2[j]);
                            
                            //get tile's coords
                            var coords_2 = [];
                            coords_2[j,1] = result_1.getElementsByTagName("north")[j].childNodes[0].nodeValue;
                            coords_2[j,2] = result_1.getElementsByTagName("south")[j].childNodes[0].nodeValue;
                            coords_2[j,3] = result_1.getElementsByTagName("east")[j].childNodes[0].nodeValue;
                            coords_2[j,4] = result_1.getElementsByTagName("west")[j].childNodes[0].nodeValue;
                            //console.log(coords_2[j,1] + coords_2[j,2] + coords_2[j,3] + coords_2[j,4]);

                            //get min and max LodPixel of each tile
                            //var min_max_2 = [];
                            //min_max_2[j,1] = result_1.getElementsByTagName("minLodPixels")[j].childNodes[0].nodeValue;
                            //min_max_2[j,2] = result_1.getElementsByTagName("maxLodPixels")[j].childNodes[0].nodeValue;
                            //console.log("minLodPixels = " + min_max_2[j,1] + "; maxLodPixels = " + min_max_2[j,2]);                 
                            
                            //Next level : Get the next KML actual position's coords
                            if (north < coords_2[j,1] && south > coords_2[j,2]  && east < coords_2[j,3] && west > coords_2[j,4]){
                                this.ioDriverXML = new IoDriverXML();
                                this.ioDriverXML.read(url_href_2[j]).then(function(result_2){
                                    
                                    var kml_2 = [];
                                    kml_2 = result_2.getElementsByTagName("href");

                                    for (k=0; k<kml_2.length; k++){
                                        var url_href_3 = [];
                                        url_href_3[k] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'REU' + "/TREE/" + kml_2[k].childNodes[0].nodeValue.replace("../", "");
                                        //console.log(url_href_3[k]);
                                        
                                        var coords_3 = [];
                                        coords_3[k,1] = result_1.getElementsByTagName("north")[k].childNodes[0].nodeValue;
                                        coords_3[k,2] = result_1.getElementsByTagName("south")[k].childNodes[0].nodeValue;
                                        coords_3[k,3] = result_1.getElementsByTagName("east")[k].childNodes[0].nodeValue;
                                        coords_3[k,4] = result_1.getElementsByTagName("west")[k].childNodes[0].nodeValue;
                                        
                                        //Next Level : Get the next KML actual position's coords
                                        if (north < coords_3[k,1] && south > coords_3[k,2]  && east < coords_3[k,3] && west > coords_3[k,4]){
                                            this.ioDriverXML_3 = new IoDriverXML();
                                            this.ioDriverXML_3.read(url_href_3[k]).then(function(result_3){

                                                var kml_3 = [];
                                                kml_3 = result_3.getElementsByTagName("href");

                                                for (l=0; l<kml_3.length; l++){
                                                    var url_href_4 = [];
                                                    url_href_4[l] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'REU' + "/" + kml_3[l].childNodes[0].nodeValue.replace("../../", "");
                                                    //console.log(url_href_4[l]);
                                                    
                                                    var coords_4 = [];
                                                    coords_4[l,1] = result_1.getElementsByTagName("north")[l].childNodes[0].nodeValue;
                                                    coords_4[l,2] = result_1.getElementsByTagName("south")[l].childNodes[0].nodeValue;
                                                    coords_4[l,3] = result_1.getElementsByTagName("east")[l].childNodes[0].nodeValue;
                                                    coords_4[l,4] = result_1.getElementsByTagName("west")[l].childNodes[0].nodeValue;

                                                }

                                            });
                                        }
                                    }

                                });
                            }

                        }    

                    });
                    
                }
                //If Saint-Pierre et Miquelon
                if (url_href_1[i] === 'http://wxs.ign.fr/j2bfkv9whnqpq04zpzlfz2ge/vecteurtuile3d/BATI3D/SPM/TREE/0/0_00_00.kml'){
                    
                    this.ioDriverXML = new IoDriverXML();
                    this.ioDriverXML.read(url_href_1[i]).then(function(result_1)
                    {

                        var kml_1 = [];                    
                        kml_1 = result_1.getElementsByTagName("href");
                        //console.log(kml_1.length);

                        for (j=0; j<kml_1.length; j++){   

                            var url_href_2 = [];
                            url_href_2[j] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'SPM' + "/TREE/" + kml_1[j].childNodes[0].nodeValue.replace("../", "");
                            //console.log(url_href_2[j]);
                            
                            //get tile's coords
                            var coords_2 = [];
                            coords_2[j,1] = result_1.getElementsByTagName("north")[j].childNodes[0].nodeValue;
                            coords_2[j,2] = result_1.getElementsByTagName("south")[j].childNodes[0].nodeValue;
                            coords_2[j,3] = result_1.getElementsByTagName("east")[j].childNodes[0].nodeValue;
                            coords_2[j,4] = result_1.getElementsByTagName("west")[j].childNodes[0].nodeValue;
                            //console.log(coords_2[j,1] + coords_2[j,2] + coords_2[j,3] + coords_2[j,4]);

                            //get min and max LodPixel of each tile
                            //var min_max_2 = [];
                            //min_max_2[j,1] = result_1.getElementsByTagName("minLodPixels")[j].childNodes[0].nodeValue;
                            //min_max_2[j,2] = result_1.getElementsByTagName("maxLodPixels")[j].childNodes[0].nodeValue;
                            //console.log("minLodPixels = " + min_max_2[j,1] + "; maxLodPixels = " + min_max_2[j,2]);                 
                            
                            //Next level : Get the next KML actual position's coords
                            if (north < coords_2[j,1] && south > coords_2[j,2]  && east < coords_2[j,3] && west > coords_2[j,4]){
                                this.ioDriverXML = new IoDriverXML();
                                this.ioDriverXML.read(url_href_2[j]).then(function(result_2){
                                    
                                    var kml_2 = [];
                                    kml_2 = result_2.getElementsByTagName("href");

                                    for (k=0; k<kml_2.length; k++){
                                        var url_href_3 = [];
                                        url_href_3[k] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'SPM' + "/TREE/" + kml_2[k].childNodes[0].nodeValue.replace("../", "");
                                        //console.log(url_href_3[k]);
                                        
                                        var coords_3 = [];
                                        coords_3[k,1] = result_1.getElementsByTagName("north")[k].childNodes[0].nodeValue;
                                        coords_3[k,2] = result_1.getElementsByTagName("south")[k].childNodes[0].nodeValue;
                                        coords_3[k,3] = result_1.getElementsByTagName("east")[k].childNodes[0].nodeValue;
                                        coords_3[k,4] = result_1.getElementsByTagName("west")[k].childNodes[0].nodeValue;
                                        
                                        //Next Level : Get the next KML actual position's coords
                                        if (north < coords_3[k,1] && south > coords_3[k,2]  && east < coords_3[k,3] && west > coords_3[k,4]){
                                            this.ioDriverXML_3 = new IoDriverXML();
                                            this.ioDriverXML_3.read(url_href_3[k]).then(function(result_3){

                                                var kml_3 = [];
                                                kml_3 = result_3.getElementsByTagName("href");

                                                for (l=0; l<kml_3.length; l++){
                                                    var url_href_4 = [];
                                                    url_href_4[l] = 'http://wxs.ign.fr/' + key + '/vecteurtuile3d/BATI3D/' + 'SPM' + "/" + kml_3[l].childNodes[0].nodeValue.replace("../../", "");
                                                    //console.log(url_href_4[l]);
                                                    
                                                    var coords_4 = [];
                                                    coords_4[l,1] = result_1.getElementsByTagName("north")[l].childNodes[0].nodeValue;
                                                    coords_4[l,2] = result_1.getElementsByTagName("south")[l].childNodes[0].nodeValue;
                                                    coords_4[l,3] = result_1.getElementsByTagName("east")[l].childNodes[0].nodeValue;
                                                    coords_4[l,4] = result_1.getElementsByTagName("west")[l].childNodes[0].nodeValue;

                                                }

                                            });
                                        }
                                    }

                                });
                            }

                        }    

                    });
                    
                }
                
         
 */