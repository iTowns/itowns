var instanceCache = null;

function CacheRessource() {
    this.cacheObjects = [];
    this._maximumSize = null;
}

CacheRessource.prototype.getRessource = function getRessource(url) {
    return this.cacheObjects[url];
};

CacheRessource.prototype.addRessource = function addRessource(url, ressource) {
    this.cacheObjects[url] = ressource;
};


CacheRessource.prototype.getRessourceByID = function getRessourceByID(/* id */) {
    // TODO: Implement Me

};

export default function () {
    instanceCache = instanceCache || new CacheRessource();
    return instanceCache;
}
