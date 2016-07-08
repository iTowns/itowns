var expect = require('chai').expect;
var ApiGlobe = require('Core/Commander/Interfaces/ApiInterface/ApiGlobe');

describe('ApiGlobe', function() {

    var initCenter = { longitude: 2.3465, latitude: 48.88, altitude: 25000000};

    beforeEach(function setupGlobe(done) {
        this.timeout(10000);

        this.viewerDiv = document.createElement('div');
        this.viewerDiv.style.width = '500px';
        this.viewerDiv.style.height = '500px';
        document.body.appendChild(this.viewerDiv);
        this.globe = new ApiGlobe();
        this.globe.createSceneGlobe(initCenter, this.viewerDiv);
        this.viewerDiv.addEventListener('globe-loaded', function() {
            done();
        });
    });
    afterEach(function teardownGlobe() {
        document.body.removeChild(this.viewerDiv);
    })

    describe('#getCenter()', function() {
        it('should correctly retrieve the center of the globe', function() {
            var center = this.globe.getCenter();
            expect(center).to.be.an('object');
            expect(center).to.have.all.keys('longitude', 'latitude', 'altitude');
            expect(center.longitude).to.be.closeTo(initCenter.longitude, 0.0001);
            expect(center.latitude).to.be.closeTo(initCenter.latitude, 0.0001);
            expect(center.altitude).to.be.closeTo(initCenter.altitude, 0.0001);
        })
    });
});
