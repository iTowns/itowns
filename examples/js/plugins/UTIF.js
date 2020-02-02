



;(function(){
var UTIF = {};

// Make available for import by `require()`
if (typeof module == "object") {module.exports = UTIF;}
else {self.UTIF = UTIF;}

var pako = (typeof require === "function") ? require("pako") : self.pako;

function log() { if (typeof process=="undefined" || process.env.NODE_ENV=="development") console.log.apply(console, arguments);  }

(function(UTIF, pako){
	
// Following lines add a JPEG decoder  to UTIF.JpegDecoder
(function(){var V="function"===typeof Symbol&&"symbol"===typeof Symbol.iterator?function(g){return typeof g}:function(g){return g&&"function"===typeof Symbol&&g.constructor===Symbol&&g!==Symbol.prototype?"symbol":typeof g},D=function(){function g(g){this.message="JPEG error: "+g}g.prototype=Error();g.prototype.name="JpegError";return g.constructor=g}(),P=function(){function g(g,D){this.message=g;this.g=D}g.prototype=Error();g.prototype.name="DNLMarkerError";return g.constructor=g}();(function(){function g(){this.M=
null;this.B=-1}function W(a,d){for(var f=0,e=[],b,B,k=16;0<k&&!a[k-1];)k--;e.push({children:[],index:0});var l=e[0],r;for(b=0;b<k;b++){for(B=0;B<a[b];B++){l=e.pop();for(l.children[l.index]=d[f];0<l.index;)l=e.pop();l.index++;for(e.push(l);e.length<=b;)e.push(r={children:[],index:0}),l.children[l.index]=r.children,l=r;f++}b+1<k&&(e.push(r={children:[],index:0}),l.children[l.index]=r.children,l=r)}return e[0].children}function X(a,d,f,e,b,B,k,l,r){function n(){if(0<x)return x--,z>>x&1;z=a[d++];if(255===
z){var c=a[d++];if(c){if(220===c&&g){d+=2;var b=a[d++]<<8|a[d++];if(0<b&&b!==f.g)throw new P("Found DNL marker (0xFFDC) while parsing scan data",b);}throw new D("unexpected marker "+(z<<8|c).toString(16));}}x=7;return z>>>7}function q(a){for(;;){a=a[n()];if("number"===typeof a)return a;if("object"!==("undefined"===typeof a?"undefined":V(a)))throw new D("invalid huffman sequence");}}function h(a){for(var c=0;0<a;)c=c<<1|n(),a--;return c}function c(a){if(1===a)return 1===n()?1:-1;var c=h(a);return c>=
1<<a-1?c:c+(-1<<a)+1}function C(a,b){var d=q(a.D);d=0===d?0:c(d);a.a[b]=a.m+=d;for(d=1;64>d;){var h=q(a.o),k=h&15;h>>=4;if(0===k){if(15>h)break;d+=16}else d+=h,a.a[b+J[d]]=c(k),d++}}function w(a,d){var b=q(a.D);b=0===b?0:c(b)<<r;a.a[d]=a.m+=b}function p(a,c){a.a[c]|=n()<<r}function m(a,b){if(0<A)A--;else for(var d=B;d<=k;){var e=q(a.o),f=e&15;e>>=4;if(0===f){if(15>e){A=h(e)+(1<<e)-1;break}d+=16}else d+=e,a.a[b+J[d]]=c(f)*(1<<r),d++}}function t(a,d){for(var b=B,e=0,f;b<=k;){f=d+J[b];var l=0>a.a[f]?
-1:1;switch(E){case 0:e=q(a.o);f=e&15;e>>=4;if(0===f)15>e?(A=h(e)+(1<<e),E=4):(e=16,E=1);else{if(1!==f)throw new D("invalid ACn encoding");Q=c(f);E=e?2:3}continue;case 1:case 2:a.a[f]?a.a[f]+=l*(n()<<r):(e--,0===e&&(E=2===E?3:0));break;case 3:a.a[f]?a.a[f]+=l*(n()<<r):(a.a[f]=Q<<r,E=0);break;case 4:a.a[f]&&(a.a[f]+=l*(n()<<r))}b++}4===E&&(A--,0===A&&(E=0))}var g=9<arguments.length&&void 0!==arguments[9]?arguments[9]:!1,u=f.P,v=d,z=0,x=0,A=0,E=0,Q,K=e.length,F,L,M,I;var R=f.S?0===B?0===l?w:p:0===l?
m:t:C;var G=0;var O=1===K?e[0].c*e[0].l:u*f.O;for(var S,T;G<O;){var U=b?Math.min(O-G,b):O;for(F=0;F<K;F++)e[F].m=0;A=0;if(1===K){var y=e[0];for(I=0;I<U;I++)R(y,64*((y.c+1)*(G/y.c|0)+G%y.c)),G++}else for(I=0;I<U;I++){for(F=0;F<K;F++)for(y=e[F],S=y.h,T=y.j,L=0;L<T;L++)for(M=0;M<S;M++)R(y,64*((y.c+1)*((G/u|0)*y.j+L)+(G%u*y.h+M)));G++}x=0;(y=N(a,d))&&y.f&&((0,_util.warn)("decodeScan - unexpected MCU data, current marker is: "+y.f),d=y.offset);y=y&&y.F;if(!y||65280>=y)throw new D("marker was not found");
if(65488<=y&&65495>=y)d+=2;else break}(y=N(a,d))&&y.f&&((0,_util.warn)("decodeScan - unexpected Scan data, current marker is: "+y.f),d=y.offset);return d-v}function Y(a,d){for(var f=d.c,e=d.l,b=new Int16Array(64),B=0;B<e;B++)for(var k=0;k<f;k++){var l=64*((d.c+1)*B+k),r=b,n=d.G,q=d.a;if(!n)throw new D("missing required Quantization Table.");for(var h=0;64>h;h+=8){var c=q[l+h];var C=q[l+h+1];var w=q[l+h+2];var p=q[l+h+3];var m=q[l+h+4];var t=q[l+h+5];var g=q[l+h+6];var u=q[l+h+7];c*=n[h];if(0===(C|
w|p|m|t|g|u))c=5793*c+512>>10,r[h]=c,r[h+1]=c,r[h+2]=c,r[h+3]=c,r[h+4]=c,r[h+5]=c,r[h+6]=c,r[h+7]=c;else{C*=n[h+1];w*=n[h+2];p*=n[h+3];m*=n[h+4];t*=n[h+5];g*=n[h+6];u*=n[h+7];var v=5793*c+128>>8;var z=5793*m+128>>8;var x=w;var A=g;m=2896*(C-u)+128>>8;u=2896*(C+u)+128>>8;p<<=4;t<<=4;v=v+z+1>>1;z=v-z;c=3784*x+1567*A+128>>8;x=1567*x-3784*A+128>>8;A=c;m=m+t+1>>1;t=m-t;u=u+p+1>>1;p=u-p;v=v+A+1>>1;A=v-A;z=z+x+1>>1;x=z-x;c=2276*m+3406*u+2048>>12;m=3406*m-2276*u+2048>>12;u=c;c=799*p+4017*t+2048>>12;p=4017*
p-799*t+2048>>12;t=c;r[h]=v+u;r[h+7]=v-u;r[h+1]=z+t;r[h+6]=z-t;r[h+2]=x+p;r[h+5]=x-p;r[h+3]=A+m;r[h+4]=A-m}}for(n=0;8>n;++n)c=r[n],C=r[n+8],w=r[n+16],p=r[n+24],m=r[n+32],t=r[n+40],g=r[n+48],u=r[n+56],0===(C|w|p|m|t|g|u)?(c=5793*c+8192>>14,c=-2040>c?0:2024<=c?255:c+2056>>4,q[l+n]=c,q[l+n+8]=c,q[l+n+16]=c,q[l+n+24]=c,q[l+n+32]=c,q[l+n+40]=c,q[l+n+48]=c,q[l+n+56]=c):(v=5793*c+2048>>12,z=5793*m+2048>>12,x=w,A=g,m=2896*(C-u)+2048>>12,u=2896*(C+u)+2048>>12,v=(v+z+1>>1)+4112,z=v-z,c=3784*x+1567*A+2048>>
12,x=1567*x-3784*A+2048>>12,A=c,m=m+t+1>>1,t=m-t,u=u+p+1>>1,p=u-p,v=v+A+1>>1,A=v-A,z=z+x+1>>1,x=z-x,c=2276*m+3406*u+2048>>12,m=3406*m-2276*u+2048>>12,u=c,c=799*p+4017*t+2048>>12,p=4017*p-799*t+2048>>12,t=c,c=v+u,u=v-u,C=z+t,g=z-t,w=x+p,t=x-p,p=A+m,m=A-m,c=16>c?0:4080<=c?255:c>>4,C=16>C?0:4080<=C?255:C>>4,w=16>w?0:4080<=w?255:w>>4,p=16>p?0:4080<=p?255:p>>4,m=16>m?0:4080<=m?255:m>>4,t=16>t?0:4080<=t?255:t>>4,g=16>g?0:4080<=g?255:g>>4,u=16>u?0:4080<=u?255:u>>4,q[l+n]=c,q[l+n+8]=C,q[l+n+16]=w,q[l+n+24]=
p,q[l+n+32]=m,q[l+n+40]=t,q[l+n+48]=g,q[l+n+56]=u)}return d.a}function N(a,d){var f=2<arguments.length&&void 0!==arguments[2]?arguments[2]:d,e=a.length-1;f=f<d?f:d;if(d>=e)return null;var b=a[d]<<8|a[d+1];if(65472<=b&&65534>=b)return{f:null,F:b,offset:d};for(var B=a[f]<<8|a[f+1];!(65472<=B&&65534>=B);){if(++f>=e)return null;B=a[f]<<8|a[f+1]}return{f:b.toString(16),F:B,offset:f}}var J=new Uint8Array([0,1,8,16,9,2,3,10,17,24,32,25,18,11,4,5,12,19,26,33,40,48,41,34,27,20,13,6,7,14,21,28,35,42,49,56,
57,50,43,36,29,22,15,23,30,37,44,51,58,59,52,45,38,31,39,46,53,60,61,54,47,55,62,63]);g.prototype={parse:function(a){function d(){var d=a[k]<<8|a[k+1];k+=2;return d}function f(){var b=d();b=k+b-2;var c=N(a,b,k);c&&c.f&&((0,_util.warn)("readDataBlock - incorrect length, current marker is: "+c.f),b=c.offset);b=a.subarray(k,b);k+=b.length;return b}function e(a){for(var b=Math.ceil(a.v/8/a.s),c=Math.ceil(a.g/8/a.u),d=0;d<a.b.length;d++){v=a.b[d];var e=Math.ceil(Math.ceil(a.v/8)*v.h/a.s),f=Math.ceil(Math.ceil(a.g/
8)*v.j/a.u);v.a=new Int16Array(64*c*v.j*(b*v.h+1));v.c=e;v.l=f}a.P=b;a.O=c}var b=(1<arguments.length&&void 0!==arguments[1]?arguments[1]:{}).N,B=void 0===b?null:b,k=0,l=null,r=0;b=[];var n=[],q=[],h=d();if(65496!==h)throw new D("SOI not found");for(h=d();65497!==h;){switch(h){case 65504:case 65505:case 65506:case 65507:case 65508:case 65509:case 65510:case 65511:case 65512:case 65513:case 65514:case 65515:case 65516:case 65517:case 65518:case 65519:case 65534:var c=f();65518===h&&65===c[0]&&100===
c[1]&&111===c[2]&&98===c[3]&&101===c[4]&&(l={version:c[5]<<8|c[6],Y:c[7]<<8|c[8],Z:c[9]<<8|c[10],W:c[11]});break;case 65499:h=d()+k-2;for(var g;k<h;){var w=a[k++],p=new Uint16Array(64);if(0===w>>4)for(c=0;64>c;c++)g=J[c],p[g]=a[k++];else if(1===w>>4)for(c=0;64>c;c++)g=J[c],p[g]=d();else throw new D("DQT - invalid table spec");b[w&15]=p}break;case 65472:case 65473:case 65474:if(m)throw new D("Only single frame JPEGs supported");d();var m={};m.X=65473===h;m.S=65474===h;m.precision=a[k++];h=d();m.g=
B||h;m.v=d();m.b=[];m.C={};c=a[k++];for(h=p=w=0;h<c;h++){g=a[k];var t=a[k+1]>>4;var H=a[k+1]&15;w<t&&(w=t);p<H&&(p=H);t=m.b.push({h:t,j:H,T:a[k+2],G:null});m.C[g]=t-1;k+=3}m.s=w;m.u=p;e(m);break;case 65476:g=d();for(h=2;h<g;){w=a[k++];p=new Uint8Array(16);for(c=t=0;16>c;c++,k++)t+=p[c]=a[k];H=new Uint8Array(t);for(c=0;c<t;c++,k++)H[c]=a[k];h+=17+t;(0===w>>4?q:n)[w&15]=W(p,H)}break;case 65501:d();var u=d();break;case 65498:c=1===++r&&!B;d();w=a[k++];g=[];for(h=0;h<w;h++){p=m.C[a[k++]];var v=m.b[p];
p=a[k++];v.D=q[p>>4];v.o=n[p&15];g.push(v)}h=a[k++];w=a[k++];p=a[k++];try{var z=X(a,k,m,g,u,h,w,p>>4,p&15,c);k+=z}catch(x){if(x instanceof P)return(0,_util.warn)('Attempting to re-parse JPEG image using "scanLines" parameter found in DNL marker (0xFFDC) segment.'),this.parse(a,{N:x.g});throw x;}break;case 65500:k+=4;break;case 65535:255!==a[k]&&k--;break;default:if(255===a[k-3]&&192<=a[k-2]&&254>=a[k-2])k-=3;else if((c=N(a,k-2))&&c.f)(0,_util.warn)("JpegImage.parse - unexpected data, current marker is: "+
c.f),k=c.offset;else throw new D("unknown marker "+h.toString(16));}h=d()}this.width=m.v;this.height=m.g;this.A=l;this.b=[];for(h=0;h<m.b.length;h++){v=m.b[h];if(u=b[v.T])v.G=u;this.b.push({R:Y(m,v),U:v.h/m.s,V:v.j/m.u,c:v.c,l:v.l})}this.i=this.b.length},L:function(a,d){var f=this.width/a,e=this.height/d,b,g,k=this.b.length,l=a*d*k,r=new Uint8ClampedArray(l),n=new Uint32Array(a);for(g=0;g<k;g++){var q=this.b[g];var h=q.U*f;var c=q.V*e;var C=g;var w=q.R;var p=q.c+1<<3;for(b=0;b<a;b++)q=0|b*h,n[b]=
(q&4294967288)<<3|q&7;for(h=0;h<d;h++)for(q=0|h*c,q=p*(q&4294967288)|(q&7)<<3,b=0;b<a;b++)r[C]=w[q+n[b]],C+=k}if(e=this.M)for(g=0;g<l;)for(f=q=0;q<k;q++,g++,f+=2)r[g]=(r[g]*e[f]>>8)+e[f+1];return r},w:function(){return this.A?!!this.A.W:3===this.i?0===this.B?!1:!0:1===this.B?!0:!1},I:function(a){for(var d,f,e,b=0,g=a.length;b<g;b+=3)d=a[b],f=a[b+1],e=a[b+2],a[b]=d-179.456+1.402*e,a[b+1]=d+135.459-.344*f-.714*e,a[b+2]=d-226.816+1.772*f;return a},K:function(a){for(var d,f,e,b,g=0,k=0,l=a.length;k<l;k+=
4)d=a[k],f=a[k+1],e=a[k+2],b=a[k+3],a[g++]=-122.67195406894+f*(-6.60635669420364E-5*f+4.37130475926232E-4*e-5.4080610064599E-5*d+4.8449797120281E-4*b-.154362151871126)+e*(-9.57964378445773E-4*e+8.17076911346625E-4*d-.00477271405408747*b+1.53380253221734)+d*(9.61250184130688E-4*d-.00266257332283933*b+.48357088451265)+b*(-3.36197177618394E-4*b+.484791561490776),a[g++]=107.268039397724+f*(2.19927104525741E-5*f-6.40992018297945E-4*e+6.59397001245577E-4*d+4.26105652938837E-4*b-.176491792462875)+e*(-7.78269941513683E-4*
e+.00130872261408275*d+7.70482631801132E-4*b-.151051492775562)+d*(.00126935368114843*d-.00265090189010898*b+.25802910206845)+b*(-3.18913117588328E-4*b-.213742400323665),a[g++]=-20.810012546947+f*(-5.70115196973677E-4*f-2.63409051004589E-5*e+.0020741088115012*d-.00288260236853442*b+.814272968359295)+e*(-1.53496057440975E-5*e-1.32689043961446E-4*d+5.60833691242812E-4*b-.195152027534049)+d*(.00174418132927582*d-.00255243321439347*b+.116935020465145)+b*(-3.43531996510555E-4*b+.24165260232407);return a.subarray(0,
g)},J:function(a){for(var d,f,e,b=0,g=a.length;b<g;b+=4)d=a[b],f=a[b+1],e=a[b+2],a[b]=434.456-d-1.402*e,a[b+1]=119.541-d+.344*f+.714*e,a[b+2]=481.816-d-1.772*f;return a},H:function(a){for(var d,f,e,b,g=0,k=1/255,l=0,r=a.length;l<r;l+=4)d=a[l]*k,f=a[l+1]*k,e=a[l+2]*k,b=a[l+3]*k,a[g++]=255+d*(-4.387332384609988*d+54.48615194189176*f+18.82290502165302*e+212.25662451639585*b-285.2331026137004)+f*(1.7149763477362134*f-5.6096736904047315*e-17.873870861415444*b-5.497006427196366)+e*(-2.5217340131683033*
e-21.248923337353073*b+17.5119270841813)-b*(21.86122147463605*b+189.48180835922747),a[g++]=255+d*(8.841041422036149*d+60.118027045597366*f+6.871425592049007*e+31.159100130055922*b-79.2970844816548)+f*(-15.310361306967817*f+17.575251261109482*e+131.35250912493976*b-190.9453302588951)+e*(4.444339102852739*e+9.8632861493405*b-24.86741582555878)-b*(20.737325471181034*b+187.80453709719578),a[g++]=255+d*(.8842522430003296*d+8.078677503112928*f+30.89978309703729*e-.23883238689178934*b-14.183576799673286)+
f*(10.49593273432072*f+63.02378494754052*e+50.606957656360734*b-112.23884253719248)+e*(.03296041114873217*e+115.60384449646641*b-193.58209356861505)-b*(22.33816807309886*b+180.12613974708367);return a.subarray(0,g)},getData:function(a,d,f){if(4<this.i)throw new D("Unsupported color mode");a=this.L(a,d);if(1===this.i&&f){f=a.length;d=new Uint8ClampedArray(3*f);for(var e=0,b=0;b<f;b++){var g=a[b];d[e++]=g;d[e++]=g;d[e++]=g}return d}if(3===this.i&&this.w())return this.I(a);if(4===this.i){if(this.w())return f?
this.K(a):this.J(a);if(f)return this.H(a)}return a}}; UTIF.JpegDecoder=g})()})();

//UTIF.JpegDecoder = PDFJS.JpegImage;


UTIF.encodeImage = function(rgba, w, h, metadata)
{
	var idf = { "t256":[w], "t257":[h], "t258":[8,8,8,8], "t259":[1], "t262":[2], "t273":[1000], // strips offset
				"t277":[4], "t278":[h], /* rows per strip */          "t279":[w*h*4], // strip byte counts
				"t282":[[72,1]], "t283":[[72,1]], "t284":[1], "t286":[[0,1]], "t287":[[0,1]], "t296":[1], "t305": ["Photopea (UTIF.js)"], "t338":[1]
		};
	if (metadata) for (var i in metadata) idf[i] = metadata[i];
	
	var prfx = new Uint8Array(UTIF.encode([idf]));
	var img = new Uint8Array(rgba);
	var data = new Uint8Array(1000+w*h*4);
	for(var i=0; i<prfx.length; i++) data[i] = prfx[i];
	for(var i=0; i<img .length; i++) data[1000+i] = img[i];
	return data.buffer;
}

UTIF.encode = function(ifds)
{
	var LE = false;
	var data = new Uint8Array(20000), offset = 4, bin = LE ? UTIF._binLE : UTIF._binBE;
	data[0]=data[1]=LE?73:77;  bin.writeUshort(data,2,42);

	var ifdo = 8;
	bin.writeUint(data, offset, ifdo);  offset+=4;
	for(var i=0; i<ifds.length; i++)
	{
		var noffs = UTIF._writeIFD(bin, UTIF._types.basic, data, ifdo, ifds[i]);
		ifdo = noffs[1];
		if(i<ifds.length-1) {
			if((ifdo&3)!=0) ifdo+=(4-(ifdo&3));  // make each IFD start at multiple of 4
			bin.writeUint(data, noffs[0], ifdo);
		}
	}
	return data.slice(0, ifdo).buffer;
}

UTIF.decode = function(buff, prm)
{
	if(prm==null) prm = {parseMN:true, debug:false};  // read MakerNote, debug
	var data = new Uint8Array(buff), offset = 0n;

	var id = UTIF._binBE.readASCII(data, offset, 2n);  offset+=2n;
	var bin = id=="II" ? UTIF._binLE : UTIF._binBE;
	var version_num = bin.readUshort(data, offset);  offset+=2n;
	console.log(version_num);
	var isBigTIFF = (version_num==43n);
	console.log(isBigTIFF);

	if (isBigTIFF) {
		var always8 = bin.readUshort(data, offset);  offset+=2n;
		var always0 = bin.readUshort(data, offset);  offset+=2n;
		console.log('always8 always0 : ', always8, always0);
		var ifdo = bin.readUlong(data, offset);  offset+=8n;
		console.log('ifdo : ', ifdo);
		var ifds = [];
		while(true) {
			var noff = UTIF._readIFD_BigTIFF(bin, data, ifdo, ifds, 0, prm);
            ifdo = bin.readUlong(data, noff);
            console.log(ifdo);
			if(ifdo==0 || noff==0) break;
		}
		return ifds;
	}
	var ifdo = BigInt(bin.readUint(data, offset));  offset+=4n;
	console.log('ifdo : ',ifdo);
	var ifds = [];
	while(true) {
		var noff = UTIF._readIFD(bin, data, ifdo, ifds, 0, prm);
		ifdo = bin.readUint(data, noff);
		if(ifdo==0 || noff==0) break;
	}
	return ifds;
}

UTIF.decodeImage = function(buff, img, ifds)
{
	var data = new Uint8Array(buff);
	var id = UTIF._binBE.readASCII(data, 0n, 2n);

	if(img["t256"]==null) return;	// No width => probably not an image
	img.isLE = id=="II";
	img.width  = img["t256"][0];  //delete img["t256"];
	img.height = img["t257"][0];  //delete img["t257"];

	var cmpr   = img["t259"] ? img["t259"][0] : 1;  //delete img["t259"];
	var fo = img["t266"] ? img["t266"][0] : 1;  //delete img["t266"];
	if(img["t284"] && img["t284"][0]==2) log("PlanarConfiguration 2 should not be used!");

	var bipp;  // bits per pixel
	if(img["t258"]) bipp = Math.min(32,img["t258"][0])*img["t258"].length;
	else            bipp = (img["t277"]?img["t277"][0]:1);  
	// Some .NEF files have t258==14, even though they use 16 bits per pixel
	if(cmpr==1 && img["t279"]!=null && img["t278"] && img["t262"][0]==32803)  {
		bipp = Math.round((img["t279"][0]*8)/(img.width*img["t278"][0]));
	}
	var bipl = Math.ceil(img.width*bipp/8)*8;
	var soff = img["t273"];  if(soff==null) soff = img["t324"];
	var bcnt = img["t279"];  if(cmpr==1 && soff.length==1) bcnt = [img.height*(bipl>>>3)];  if(bcnt==null) bcnt = img["t325"];
	var bytes = new Uint8Array(img.height*(bipl>>>3)), bilen = 0;

	if(img["t322"]!=null) // tiled
	{
		var tw = img["t322"][0], th = img["t323"][0];
		var tx = Math.floor((img.width  + tw - 1) / tw);
		var ty = Math.floor((img.height + th - 1) / th);
		var tbuff = new Uint8Array(Math.ceil(tw*th*bipp/8)|0);
		for(var y=0; y<ty; y++)
			for(var x=0; x<tx; x++)
			{
				var i = y*tx+x;  for(var j=0; j<tbuff.length; j++) tbuff[j]=0;
				UTIF.decode._decompress(img,ifds, data, soff[i], bcnt[i], cmpr, tbuff, 0, fo);
				// Might be required for 7 too. Need to check
				if (cmpr==6) bytes = tbuff;
				else UTIF._copyTile(tbuff, Math.ceil(tw*bipp/8)|0, th, bytes, Math.ceil(img.width*bipp/8)|0, img.height, Math.ceil(x*tw*bipp/8)|0, y*th);
			}
		bilen = bytes.length*8;
	}
	else	// stripped
	{
		var rps = img["t278"] ? img["t278"][0] : img.height;   rps = Math.min(rps, img.height);
		for(var i=0; i<soff.length; i++)
		{
			UTIF.decode._decompress(img,ifds, data, soff[i], bcnt[i], cmpr, bytes, Math.ceil(bilen/8)|0, fo);
			bilen += bipl * rps;
		}
		bilen = Math.min(bilen, bytes.length*8);
	}
	img.data = new Uint8Array(bytes.buffer, 0, Math.ceil(bilen/8)|0);
}

UTIF.decode._decompress = function(img,ifds, data, off, len, cmpr, tgt, toff, fo)  // fill order
{
	//console.log("compression", cmpr);
	//var time = Date.now();
	if(false) {}
	else if(cmpr==1 || (len==tgt.length && cmpr!=32767)) for(var j=0; j<len; j++) tgt[toff+j] = data[off+j];
	else if(cmpr==3) UTIF.decode._decodeG3 (data, off, len, tgt, toff, img.width, fo, img["t292"]?((img["t292"][0]&1)==1):false);
	else if(cmpr==4) UTIF.decode._decodeG4 (data, off, len, tgt, toff, img.width, fo);
	else if(cmpr==5) UTIF.decode._decodeLZW(data, off, tgt, toff);
	else if(cmpr==6) UTIF.decode._decodeOldJPEG(img, data, off, len, tgt, toff);
	else if(cmpr==7) UTIF.decode._decodeNewJPEG(img, data, off, len, tgt, toff);
	else if(cmpr==8) {  var src = new Uint8Array(data.buffer,off,len);  var bin = pako["inflate"](src);  for(var i=0; i<bin.length; i++) tgt[toff+i]=bin[i];  }
	else if(cmpr==32767) UTIF.decode._decodeARW(img, data, off, len, tgt, toff);
	else if(cmpr==32773) UTIF.decode._decodePackBits(data, off, len, tgt, toff);
	else if(cmpr==32809) UTIF.decode._decodeThunder (data, off, len, tgt, toff);
	else if(cmpr==34713) //for(var j=0; j<len; j++) tgt[toff+j] = data[off+j];
		UTIF.decode._decodeNikon   (img,ifds, data, off, len, tgt, toff);
	else log("Unknown compression", cmpr);
	
	//console.log(Date.now()-time);
	
	var bps = (img["t258"]?Math.min(32,img["t258"][0]):1);
	var noc = (img["t277"]?img["t277"][0]:1), bpp=(bps*noc)>>>3, h = (img["t278"] ? img["t278"][0] : img.height), bpl = Math.ceil(bps*noc*img.width/8);
	
	// convert to Little Endian  /*
	if(bps==16 && !img.isLE && img["t33422"]==null)  // not DNG
		for(var y=0; y<h; y++) {
			//console.log("fixing endianity");
			var roff = toff+y*bpl;
			for(var x=1; x<bpl; x+=2) {  var t=tgt[roff+x];  tgt[roff+x]=tgt[roff+x-1];  tgt[roff+x-1]=t;  }
		}  //*/

	if(img["t317"] && img["t317"][0]==2)
	{
		for(var y=0; y<h; y++)
		{
			var ntoff = toff+y*bpl;
			if(bps==16) for(var j=bpp; j<bpl; j+=2) {
				var nv = ((tgt[ntoff+j+1]<<8)|tgt[ntoff+j])  +  ((tgt[ntoff+j-bpp+1]<<8)|tgt[ntoff+j-bpp]);
				tgt[ntoff+j] = nv&255;  tgt[ntoff+j+1] = (nv>>>8)&255;  
			}
			else if(noc==3) for(var j=  3; j<bpl; j+=3)
			{
				tgt[ntoff+j  ] = (tgt[ntoff+j  ] + tgt[ntoff+j-3])&255;
				tgt[ntoff+j+1] = (tgt[ntoff+j+1] + tgt[ntoff+j-2])&255;
				tgt[ntoff+j+2] = (tgt[ntoff+j+2] + tgt[ntoff+j-1])&255;
			}
			else for(var j=bpp; j<bpl; j++) tgt[ntoff+j] = (tgt[ntoff+j] + tgt[ntoff+j-bpp])&255;
		}
	}
}

UTIF.decode._ljpeg_diff = function(data, prm, huff) {
	var getbithuff   = UTIF.decode._getbithuff;
	var len, diff;
	len  = getbithuff(data, prm, huff[0], huff);
	diff = getbithuff(data, prm, len, 0);
	if ((diff & (1 << (len-1))) == 0)  diff -= (1 << len) - 1;
	return diff;
}
UTIF.decode._decodeARW = function(img, inp, off, src_length, tgt, toff) {
	var raw_width = img["t256"][0], height=img["t257"][0], tiff_bps=img["t258"][0];
	var bin=(img.isLE ? UTIF._binLE : UTIF._binBE);
	//console.log(raw_width, height, tiff_bps, raw_width*height, src_length);
	var arw2 = (raw_width*height == src_length) || (raw_width*height*1.5 == src_length);
	//arw2 = true;
	//console.log("ARW2: ", arw2, raw_width*height, src_length, tgt.length);
	if(!arw2) {  //"sony_arw_load_raw"; // not arw2
		height+=8;
		var prm = [off,0,0,0];
		var huff = new Uint16Array(32770);
		var tab = [ 0xf11,0xf10,0xe0f,0xd0e,0xc0d,0xb0c,0xa0b,0x90a,0x809,
			0x708,0x607,0x506,0x405,0x304,0x303,0x300,0x202,0x201 ];
		var i, c, n, col, row, sum=0;
		var ljpeg_diff = UTIF.decode._ljpeg_diff;

		huff[0] = 15;
		for (n=i=0; i < 18; i++) {
			var lim = 32768 >>> (tab[i] >>> 8);
			for(var c=0; c<lim; c++) huff[++n] = tab[i];
		}
		for (col = raw_width; col--; )
			for (row=0; row < height+1; row+=2) {
				if (row == height) row = 1;
				sum += ljpeg_diff(inp, prm, huff);
				if (row < height) {
					var clr =  (sum)&4095;
					UTIF.decode._putsF(tgt, (row*raw_width+col)*tiff_bps, clr<<(16-tiff_bps));
				}
			}
		return;
	}
	if(raw_width*height*1.5==src_length) {
		//console.log("weird compression");
		for(var i=0; i<src_length; i+=3) {  var b0=inp[off+i+0], b1=inp[off+i+1], b2=inp[off+i+2];  
			tgt[toff+i]=(b1<<4)|(b0>>>4);  tgt[toff+i+1]=(b0<<4)|(b2>>>4);  tgt[toff+i+2]=(b2<<4)|(b1>>>4);  }
		return;
	}
	
	var pix = new Uint16Array(16);
	var row, col, val, max, min, imax, imin, sh, bit, i,    dp;
	
	var data = new Uint8Array(raw_width+1);
	for (row=0; row < height; row++) {
		//fread (data, 1, raw_width, ifp);
		for(var j=0; j<raw_width; j++) data[j]=inp[off++];
		for (dp=0, col=0; col < raw_width-30; dp+=16) {
			max  = 0x7ff & (val = bin.readUint(data,dp));
			min  = 0x7ff & (val >>> 11);
			imax = 0x0f & (val >>> 22);
			imin = 0x0f & (val >>> 26);
			for (sh=0; sh < 4 && 0x80 << sh <= max-min; sh++);
			for (bit=30, i=0; i < 16; i++)
				if      (i == imax) pix[i] = max;
				else if (i == imin) pix[i] = min;
				else {
					pix[i] = ((bin.readUshort(data, dp+(bit >> 3)) >>> (bit & 7) & 0x7f) << sh) + min;
					if (pix[i] > 0x7ff) pix[i] = 0x7ff;
					bit += 7;
				}
			for (i=0; i < 16; i++, col+=2) {
				//RAW(row,col) = curve[pix[i] << 1] >> 2;
				var clr =  pix[i]<<1;   //clr = 0xffff;
				UTIF.decode._putsF(tgt, (row*raw_width+col)*tiff_bps, clr<<(16-tiff_bps));
			}
			col -= col & 1 ? 1:31;
		}
	}
}

UTIF.decode._decodeNikon = function(img,imgs, data, off, src_length, tgt, toff)
{
	var nikon_tree = [
    [ 0, 0,1,5,1,1,1,1,1,1,2,0,0,0,0,0,0,	/* 12-bit lossy */
      5,4,3,6,2,7,1,0,8,9,11,10,12 ],
    [ 0, 0,1,5,1,1,1,1,1,1,2,0,0,0,0,0,0,	/* 12-bit lossy after split */
      0x39,0x5a,0x38,0x27,0x16,5,4,3,2,1,0,11,12,12 ],
    [ 0, 0,1,4,2,3,1,2,0,0,0,0,0,0,0,0,0,  /* 12-bit lossless */
      5,4,6,3,7,2,8,1,9,0,10,11,12 ],
    [ 0, 0,1,4,3,1,1,1,1,1,2,0,0,0,0,0,0,	/* 14-bit lossy */
      5,6,4,7,8,3,9,2,1,0,10,11,12,13,14 ],
    [ 0, 0,1,5,1,1,1,1,1,1,1,2,0,0,0,0,0,	/* 14-bit lossy after split */
      8,0x5c,0x4b,0x3a,0x29,7,6,5,4,3,2,1,0,13,14 ],
    [ 0, 0,1,4,2,2,3,1,2,0,0,0,0,0,0,0,0,	/* 14-bit lossless */
      7,6,8,5,9,4,10,3,11,12,2,0,1,13,14 ] ];
	  
	var raw_width = img["t256"][0], height=img["t257"][0], tiff_bps=img["t258"][0];
	
	var tree = 0, split = 0;
	var make_decoder = UTIF.decode._make_decoder;
	var getbithuff   = UTIF.decode._getbithuff;
	
	var mn = imgs[0].exifIFD.makerNote, md = mn["t150"]?mn["t150"]:mn["t140"], mdo=0;  //console.log(mn,md);
	//console.log(md[0].toString(16), md[1].toString(16), tiff_bps);
	var ver0 = md[mdo++], ver1 = md[mdo++];
	if (ver0 == 0x49 || ver1 == 0x58)  mdo+=2110;
	if (ver0 == 0x46) tree = 2;
	if (tiff_bps == 14) tree += 3;
	
	var vpred = [[0,0],[0,0]], bin=(img.isLE ? UTIF._binLE : UTIF._binBE);
	for(var i=0; i<2; i++) for(var j=0; j<2; j++) {  vpred[i][j] = bin.readShort(md,mdo);  mdo+=2;   }  // not sure here ... [i][j] or [j][i]
	//console.log(vpred);
	
	
	var max = 1 << tiff_bps & 0x7fff, step=0;
	var csize = bin.readShort(md,mdo);  mdo+=2;
	if (csize > 1) step = Math.floor(max / (csize-1));
	if (ver0 == 0x44 && ver1 == 0x20 && step > 0)  split = bin.readShort(md,562);
	
	
	var i;
	var row, col;
	var len, shl, diff;
	var min_v = 0;
	var hpred = [0,0];
	var huff = make_decoder(nikon_tree[tree]);
	
	//var g_input_offset=0, bitbuf=0, vbits=0, reset=0;
	var prm = [off,0,0,0];
	//console.log(split);  split = 170;
	
	for (min_v=row=0; row < height; row++) {
		if (split && row == split) {
			//free (huff);
			huff = make_decoder (nikon_tree[tree+1]);
			//max_v += (min_v = 16) << 1;
		}
		for (col=0; col < raw_width; col++) {
			i = getbithuff(data,prm,huff[0],huff);
			len = i  & 15;
			shl = i >>> 4;
			diff = (((getbithuff(data,prm,len-shl,0) << 1) + 1) << shl) >>> 1;
			if ((diff & (1 << (len-1))) == 0)
				diff -= (1 << len) - (shl==0?1:0);
			if (col < 2) hpred[col] = vpred[row & 1][col] += diff;
			else         hpred[col & 1] += diff;
			
			var clr = Math.min(Math.max(hpred[col & 1],0),(1<<tiff_bps)-1);
			var bti = (row*raw_width+col)*tiff_bps;  
			UTIF.decode._putsF(tgt, bti, clr<<(16-tiff_bps));
		}
	}
}
// put 16 bits
UTIF.decode._putsF= function(dt, pos, val) {  val = val<<(8-(pos&7));  var o=(pos>>>3);  dt[o]|=val>>>16;  dt[o+1]|=val>>>8;  dt[o+2]|=val;  }


UTIF.decode._getbithuff = function(data,prm,nbits, huff) {
	var zero_after_ff = 0;
	var get_byte = UTIF.decode._get_byte;
	var c;
  
	var off=prm[0], bitbuf=prm[1], vbits=prm[2], reset=prm[3];

	//if (nbits > 25) return 0;
	//if (nbits <  0) return bitbuf = vbits = reset = 0;
	if (nbits == 0 || vbits < 0) return 0; 
	while (!reset && vbits < nbits && (c = data[off++]) != -1 &&
		!(reset = zero_after_ff && c == 0xff && data[off++])) {
		//console.log("byte read into c");
		bitbuf = (bitbuf << 8) + c;
		vbits += 8;
	} 
	c = (bitbuf << (32-vbits)) >>> (32-nbits);
	if (huff) {
		vbits -= huff[c+1] >>> 8;  //console.log(c, huff[c]>>8);
		c =  huff[c+1]&255;
	} else
		vbits -= nbits;
	if (vbits < 0) throw "e";
  
	prm[0]=off;  prm[1]=bitbuf;  prm[2]=vbits;  prm[3]=reset;
  
	return c;
}

UTIF.decode._make_decoder = function(source) {
	var max, len, h, i, j;
	var huff = [];

	for (max=16; max!=0 && !source[max]; max--);
	var si=17;
	
	huff[0] = max;
	for (h=len=1; len <= max; len++)
		for (i=0; i < source[len]; i++, ++si)
			for (j=0; j < 1 << (max-len); j++)
				if (h <= 1 << max)
					huff[h++] = (len << 8) | source[si];
	return huff;
}

UTIF.decode._decodeNewJPEG = function(img, data, off, len, tgt, toff)
{
	var tables = img["t347"], tlen = tables ? tables.length : 0, buff = new Uint8Array(tlen + len);
	
	if (tables) {
		var SOI = 216, EOI = 217, boff = 0;
		for (var i=0; i<(tlen-1); i++)
		{
			// Skip EOI marker from JPEGTables
			if (tables[i]==255 && tables[i+1]==EOI) break;
			buff[boff++] = tables[i];
		}

		// Skip SOI marker from data
		var byte1 = data[off], byte2 = data[off + 1];
		if (byte1!=255 || byte2!=SOI)
		{
			buff[boff++] = byte1;
			buff[boff++] = byte2;
		}
		for (var i=2; i<len; i++) buff[boff++] = data[off+i];
	}
	else for (var i=0; i<len; i++) buff[i] = data[off+i];

	if(img["t262"][0]==32803 || img["t262"][0]==34892) // lossless JPEG and lossy JPEG (used in DNG files)
	{
		var bps = img["t258"][0];//, dcdr = new LosslessJpegDecoder();
		var out = UTIF.LosslessJpegDecode(buff), olen=out.length;  //console.log(olen);
		
		if(false) {}
		else if(bps==16) {
			if(img.isLE) for(var i=0; i<olen; i++ ) {  tgt[toff+(i<<1)] = (out[i]&255);  tgt[toff+(i<<1)+1] = (out[i]>>>8);  }
			else         for(var i=0; i<olen; i++ ) {  tgt[toff+(i<<1)] = (out[i]>>>8);  tgt[toff+(i<<1)+1] = (out[i]&255);  }
		}
		else if(bps==14 || bps==12) {  // 4 * 14 == 56 == 7 * 8
			var rst = 16-bps;
			for(var i=0; i<olen; i++) UTIF.decode._putsF(tgt, i*bps, out[i]<<rst);
		}
		else throw new Error("unsupported bit depth "+bps);
	}
	else
	{
		var parser = new UTIF.JpegDecoder();  parser.parse(buff);
		var decoded = parser.getData(parser.width, parser.height);
		for (var i=0; i<decoded.length; i++) tgt[toff + i] = decoded[i];
	}

	// PhotometricInterpretation is 6 (YCbCr) for JPEG, but after decoding we populate data in
	// RGB format, so updating the tag value
	if(img["t262"][0] == 6)  img["t262"][0] = 2;
}

UTIF.decode._decodeOldJPEGInit = function(img, data, off, len)
{
	var SOI = 216, EOI = 217, DQT = 219, DHT = 196, DRI = 221, SOF0 = 192, SOS = 218;
	var joff = 0, soff = 0, tables, sosMarker, isTiled = false, i, j, k;
	var jpgIchgFmt    = img["t513"], jifoff = jpgIchgFmt ? jpgIchgFmt[0] : 0;
	var jpgIchgFmtLen = img["t514"], jiflen = jpgIchgFmtLen ? jpgIchgFmtLen[0] : 0;
	var soffTag       = img["t324"] || img["t273"] || jpgIchgFmt;
	var ycbcrss       = img["t530"], ssx = 0, ssy = 0;
	var spp           = img["t277"]?img["t277"][0]:1;
	var jpgresint     = img["t515"];

	if(soffTag)
	{
		soff = soffTag[0];
		isTiled = (soffTag.length > 1);
	}

	if(!isTiled)
	{
		if(data[off]==255 && data[off+1]==SOI) return { jpegOffset: off };
		if(jpgIchgFmt!=null)
		{
			if(data[off+jifoff]==255 && data[off+jifoff+1]==SOI) joff = off+jifoff;
			else log("JPEGInterchangeFormat does not point to SOI");

			if(jpgIchgFmtLen==null) log("JPEGInterchangeFormatLength field is missing");
			else if(jifoff >= soff || (jifoff+jiflen) <= soff) log("JPEGInterchangeFormatLength field value is invalid");

			if(joff != null) return { jpegOffset: joff };
		}
	}

	if(ycbcrss!=null) {  ssx = ycbcrss[0];  ssy = ycbcrss[1];  }

	if(jpgIchgFmt!=null)
		if(jpgIchgFmtLen!=null)
			if(jiflen >= 2 && (jifoff+jiflen) <= soff)
			{
				if(data[off+jifoff+jiflen-2]==255 && data[off+jifoff+jiflen-1]==SOI) tables = new Uint8Array(jiflen-2);
				else tables = new Uint8Array(jiflen);

				for(i=0; i<tables.length; i++) tables[i] = data[off+jifoff+i];
				log("Incorrect JPEG interchange format: using JPEGInterchangeFormat offset to derive tables");
			}
			else log("JPEGInterchangeFormat+JPEGInterchangeFormatLength > offset to first strip or tile");

	if(tables == null)
	{
		var ooff = 0, out = [];
		out[ooff++] = 255; out[ooff++] = SOI;

		var qtables = img["t519"];
		if(qtables==null) throw new Error("JPEGQTables tag is missing");
		for(i=0; i<qtables.length; i++)
		{
			out[ooff++] = 255; out[ooff++] = DQT; out[ooff++] = 0; out[ooff++] = 67; out[ooff++] = i;
			for(j=0; j<64; j++) out[ooff++] = data[off+qtables[i]+j];
		}

		for(k=0; k<2; k++)
		{
			var htables = img[(k == 0) ? "t520" : "t521"];
			if(htables==null) throw new Error(((k == 0) ? "JPEGDCTables" : "JPEGACTables") + " tag is missing");
			for(i=0; i<htables.length; i++)
			{
				out[ooff++] = 255; out[ooff++] = DHT;
				//out[ooff++] = 0; out[ooff++] = 67; out[ooff++] = i;
				var nc = 19;
				for(j=0; j<16; j++) nc += data[off+htables[i]+j];

				out[ooff++] = (nc >>> 8); out[ooff++] = nc & 255;
				out[ooff++] = (i | (k << 4));
				for(j=0; j<16; j++) out[ooff++] = data[off+htables[i]+j];
				for(j=0; j<nc; j++) out[ooff++] = data[off+htables[i]+16+j];
			}
		}

		out[ooff++] = 255; out[ooff++] = SOF0;
		out[ooff++] = 0;  out[ooff++] = 8 + 3*spp;  out[ooff++] = 8;
		out[ooff++] = (img.height >>> 8) & 255;  out[ooff++] = img.height & 255;
		out[ooff++] = (img.width  >>> 8) & 255;  out[ooff++] = img.width  & 255;
		out[ooff++] = spp;
		if(spp==1) {  out[ooff++] = 1;  out[ooff++] = 17;  out[ooff++] = 0;  }
		else for(i=0; i<3; i++)
		{
			out[ooff++] = i + 1;
			out[ooff++] = (i != 0) ? 17 : (((ssx & 15) << 4) | (ssy & 15));
			out[ooff++] = i;
		}

		if(jpgresint!=null && jpgresint[0]!=0)
		{
			out[ooff++] = 255;  out[ooff++] = DRI;  out[ooff++] = 0;  out[ooff++] = 4;
			out[ooff++] = (jpgresint[0] >>> 8) & 255;
			out[ooff++] = jpgresint[0] & 255;
		}

		tables = new Uint8Array(out);
	}

	var sofpos = -1;
	i = 0;
	while(i < (tables.length - 1)) {
		if(tables[i]==255 && tables[i+1]==SOF0) {  sofpos = i; break;  }
		i++;
	}

	if(sofpos == -1)
	{
		var tmptab = new Uint8Array(tables.length + 10 + 3*spp);
		tmptab.set(tables);
		var tmpoff = tables.length;
		sofpos = tables.length;
		tables = tmptab;

		tables[tmpoff++] = 255; tables[tmpoff++] = SOF0;
		tables[tmpoff++] = 0;  tables[tmpoff++] = 8 + 3*spp;  tables[tmpoff++] = 8;
		tables[tmpoff++] = (img.height >>> 8) & 255;  tables[tmpoff++] = img.height & 255;
		tables[tmpoff++] = (img.width  >>> 8) & 255;  tables[tmpoff++] = img.width  & 255;
		tables[tmpoff++] = spp;
		if(spp==1) {  tables[tmpoff++] = 1;  tables[tmpoff++] = 17;  tables[tmpoff++] = 0;  }
		else for(i=0; i<3; i++)
		{
			tables[tmpoff++] = i + 1;
			tables[tmpoff++] = (i != 0) ? 17 : (((ssx & 15) << 4) | (ssy & 15));
			tables[tmpoff++] = i;
		}
	}

	if(data[soff]==255 && data[soff+1]==SOS)
	{
		var soslen = (data[soff+2]<<8) | data[soff+3];
		sosMarker = new Uint8Array(soslen+2);
		sosMarker[0] = data[soff];  sosMarker[1] = data[soff+1]; sosMarker[2] = data[soff+2];  sosMarker[3] = data[soff+3];
		for(i=0; i<(soslen-2); i++) sosMarker[i+4] = data[soff+i+4];
	}
	else
	{
		sosMarker = new Uint8Array(2 + 6 + 2*spp);
		var sosoff = 0;
		sosMarker[sosoff++] = 255;  sosMarker[sosoff++] = SOS;
		sosMarker[sosoff++] = 0;  sosMarker[sosoff++] = 6 + 2*spp;  sosMarker[sosoff++] = spp;
		if(spp==1) {  sosMarker[sosoff++] = 1;  sosMarker[sosoff++] = 0;  }
		else for(i=0; i<3; i++)
		{
			sosMarker[sosoff++] = i+1;  sosMarker[sosoff++] = (i << 4) | i;
		}
		sosMarker[sosoff++] = 0;  sosMarker[sosoff++] = 63;  sosMarker[sosoff++] = 0;
	}

	return { jpegOffset: off, tables: tables, sosMarker: sosMarker, sofPosition: sofpos };
}

UTIF.decode._decodeOldJPEG = function(img, data, off, len, tgt, toff)
{
	var i, dlen, tlen, buff, buffoff;
	var jpegData = UTIF.decode._decodeOldJPEGInit(img, data, off, len);

	if(jpegData.jpegOffset!=null)
	{
		dlen = off+len-jpegData.jpegOffset;
		buff = new Uint8Array(dlen);
		for(i=0; i<dlen; i++) buff[i] = data[jpegData.jpegOffset+i];
	}
	else
	{
		tlen = jpegData.tables.length;
		buff = new Uint8Array(tlen + jpegData.sosMarker.length + len + 2);
		buff.set(jpegData.tables);
		buffoff = tlen;

		buff[jpegData.sofPosition+5] = (img.height >>> 8) & 255;  buff[jpegData.sofPosition+6] = img.height & 255;
		buff[jpegData.sofPosition+7] = (img.width  >>> 8) & 255;  buff[jpegData.sofPosition+8] = img.width  & 255;

		if(data[off]!=255 || data[off+1]!=SOS)
		{
			buff.set(jpegData.sosMarker, buffoff);
			buffoff += sosMarker.length;
		}
		for(i=0; i<len; i++) buff[buffoff++] = data[off+i];
		buff[buffoff++] = 255;  buff[buffoff++] = EOI;
	}

	var parser = new UTIF.JpegDecoder();  parser.parse(buff);
	var decoded = parser.getData(parser.width, parser.height);
	for (var i=0; i<decoded.length; i++) tgt[toff + i] = decoded[i];

	// PhotometricInterpretation is 6 (YCbCr) for JPEG, but after decoding we populate data in
	// RGB format, so updating the tag value
	if(img["t262"] && img["t262"][0] == 6)  img["t262"][0] = 2;
}

UTIF.decode._decodePackBits = function(data, off, len, tgt, toff)
{
	var sa = new Int8Array(data.buffer), ta = new Int8Array(tgt.buffer), lim = off+len;
	while(off<lim)
	{
		var n = sa[off];  off++;
		if(n>=0  && n<128)    for(var i=0; i< n+1; i++) {  ta[toff]=sa[off];  toff++;  off++;   }
		if(n>=-127 && n<0) {  for(var i=0; i<-n+1; i++) {  ta[toff]=sa[off];  toff++;           }  off++;  }
	}
}

UTIF.decode._decodeThunder = function(data, off, len, tgt, toff)
{
	var d2 = [ 0, 1, 0, -1 ],  d3 = [ 0, 1, 2, 3, 0, -3, -2, -1 ];
	var lim = off+len, qoff = toff*2, px = 0;
	while(off<lim)
	{
		var b = data[off], msk = (b>>>6), n = (b&63);  off++;
		if(msk==3) { px=(n&15);  tgt[qoff>>>1] |= (px<<(4*(1-qoff&1)));  qoff++;   }
		if(msk==0) for(var i=0; i<n; i++) {  tgt[qoff>>>1] |= (px<<(4*(1-qoff&1)));  qoff++;   }
		if(msk==2) for(var i=0; i<2; i++) {  var d=(n>>>(3*(1-i)))&7;  if(d!=4) { px+=d3[d];  tgt[qoff>>>1] |= (px<<(4*(1-qoff&1)));  qoff++; }  }
		if(msk==1) for(var i=0; i<3; i++) {  var d=(n>>>(2*(2-i)))&3;  if(d!=2) { px+=d2[d];  tgt[qoff>>>1] |= (px<<(4*(1-qoff&1)));  qoff++; }  }
	}
}

UTIF.decode._dmap = { "1":0,"011":1,"000011":2,"0000011":3, "010":-1,"000010":-2,"0000010":-3  };
UTIF.decode._lens = ( function()
{
	var addKeys = function(lens, arr, i0, inc) {  for(var i=0; i<arr.length; i++) lens[arr[i]] = i0 + i*inc;  }

	var termW = "00110101,000111,0111,1000,1011,1100,1110,1111,10011,10100,00111,01000,001000,000011,110100,110101," // 15
	+ "101010,101011,0100111,0001100,0001000,0010111,0000011,0000100,0101000,0101011,0010011,0100100,0011000,00000010,00000011,00011010," // 31
	+ "00011011,00010010,00010011,00010100,00010101,00010110,00010111,00101000,00101001,00101010,00101011,00101100,00101101,00000100,00000101,00001010," // 47
	+ "00001011,01010010,01010011,01010100,01010101,00100100,00100101,01011000,01011001,01011010,01011011,01001010,01001011,00110010,00110011,00110100";

	var termB = "0000110111,010,11,10,011,0011,0010,00011,000101,000100,0000100,0000101,0000111,00000100,00000111,000011000," // 15
	+ "0000010111,0000011000,0000001000,00001100111,00001101000,00001101100,00000110111,00000101000,00000010111,00000011000,000011001010,000011001011,000011001100,000011001101,000001101000,000001101001," // 31
	+ "000001101010,000001101011,000011010010,000011010011,000011010100,000011010101,000011010110,000011010111,000001101100,000001101101,000011011010,000011011011,000001010100,000001010101,000001010110,000001010111," // 47
	+ "000001100100,000001100101,000001010010,000001010011,000000100100,000000110111,000000111000,000000100111,000000101000,000001011000,000001011001,000000101011,000000101100,000001011010,000001100110,000001100111";

	var makeW = "11011,10010,010111,0110111,00110110,00110111,01100100,01100101,01101000,01100111,011001100,011001101,011010010,011010011,011010100,011010101,011010110,"
	+ "011010111,011011000,011011001,011011010,011011011,010011000,010011001,010011010,011000,010011011";

	var makeB = "0000001111,000011001000,000011001001,000001011011,000000110011,000000110100,000000110101,0000001101100,0000001101101,0000001001010,0000001001011,0000001001100,"
	+ "0000001001101,0000001110010,0000001110011,0000001110100,0000001110101,0000001110110,0000001110111,0000001010010,0000001010011,0000001010100,0000001010101,0000001011010,"
	+ "0000001011011,0000001100100,0000001100101";

	var makeA = "00000001000,00000001100,00000001101,000000010010,000000010011,000000010100,000000010101,000000010110,000000010111,000000011100,000000011101,000000011110,000000011111";

	termW = termW.split(",");  termB = termB.split(",");  makeW = makeW.split(",");  makeB = makeB.split(",");  makeA = makeA.split(",");

	var lensW = {}, lensB = {};
	addKeys(lensW, termW, 0, 1);  addKeys(lensW, makeW, 64,64);  addKeys(lensW, makeA, 1792,64);
	addKeys(lensB, termB, 0, 1);  addKeys(lensB, makeB, 64,64);  addKeys(lensB, makeA, 1792,64);
	return [lensW, lensB];
} )();

UTIF.decode._decodeG4 = function(data, off, slen, tgt, toff, w, fo)
{
	var U = UTIF.decode, boff=off<<3, len=0, wrd="";	// previous starts with 1
	var line=[], pline=[];  for(var i=0; i<w; i++) pline.push(0);  pline=U._makeDiff(pline);
	var a0=0, a1=0, a2=0, b1=0, b2=0, clr=0;
	var y=0, mode="", toRead=0;
	var bipl = Math.ceil(w/8)*8;

	while((boff>>>3)<off+slen)
	{
		b1 = U._findDiff(pline, a0+(a0==0?0:1), 1-clr), b2 = U._findDiff(pline, b1, clr);	// could be precomputed
		var bit =0;
		if(fo==1) bit = (data[boff>>>3]>>>(7-(boff&7)))&1;
		if(fo==2) bit = (data[boff>>>3]>>>(  (boff&7)))&1;
		boff++;  wrd+=bit;
		if(mode=="H")
		{
			if(U._lens[clr][wrd]!=null)
			{
				var dl=U._lens[clr][wrd];  wrd="";  len+=dl;
				if(dl<64) {  U._addNtimes(line,len,clr);  a0+=len;  clr=1-clr;  len=0;  toRead--;  if(toRead==0) mode="";  }
			}
		}
		else
		{
			if(wrd=="0001")  {  wrd="";  U._addNtimes(line,b2-a0,clr);  a0=b2;   }
			if(wrd=="001" )  {  wrd="";  mode="H";  toRead=2;  }
			if(U._dmap[wrd]!=null) {  a1 = b1+U._dmap[wrd];  U._addNtimes(line, a1-a0, clr);  a0=a1;  wrd="";  clr=1-clr;  }
		}
		if(line.length==w && mode=="")
		{
			U._writeBits(line, tgt, toff*8+y*bipl);
			clr=0;  y++;  a0=0;
			pline=U._makeDiff(line);  line=[];
		}
		//if(wrd.length>150) {  log(wrd);  break;  throw "e";  }
	}
}

UTIF.decode._findDiff = function(line, x, clr) {  for(var i=0; i<line.length; i+=2) if(line[i]>=x && line[i+1]==clr)  return line[i];  }

UTIF.decode._makeDiff = function(line)
{
	var out = [];  if(line[0]==1) out.push(0,1);
	for(var i=1; i<line.length; i++) if(line[i-1]!=line[i]) out.push(i, line[i]);
	out.push(line.length,0,line.length,1);  return out;
}

UTIF.decode._decodeG3 = function(data, off, slen, tgt, toff, w, fo, twoDim)
{
	var U = UTIF.decode, boff=off<<3, len=0, wrd="";
	var line=[], pline=[];  for(var i=0; i<w; i++) line.push(0);
	var a0=0, a1=0, a2=0, b1=0, b2=0, clr=0;
	var y=-1, mode="", toRead=0, is1D=true;
	var bipl = Math.ceil(w/8)*8;
	while((boff>>>3)<off+slen)
	{
		b1 = U._findDiff(pline, a0+(a0==0?0:1), 1-clr), b2 = U._findDiff(pline, b1, clr);	// could be precomputed
		var bit =0;
		if(fo==1) bit = (data[boff>>>3]>>>(7-(boff&7)))&1;
		if(fo==2) bit = (data[boff>>>3]>>>(  (boff&7)))&1;
		boff++;  wrd+=bit;

		if(is1D)
		{
			if(U._lens[clr][wrd]!=null)
			{
				var dl=U._lens[clr][wrd];  wrd="";  len+=dl;
				if(dl<64) {  U._addNtimes(line,len,clr);  clr=1-clr;  len=0;  }
			}
		}
		else
		{
			if(mode=="H")
			{
				if(U._lens[clr][wrd]!=null)
				{
					var dl=U._lens[clr][wrd];  wrd="";  len+=dl;
					if(dl<64) {  U._addNtimes(line,len,clr);  a0+=len;  clr=1-clr;  len=0;  toRead--;  if(toRead==0) mode="";  }
				}
			}
			else
			{
				if(wrd=="0001")  {  wrd="";  U._addNtimes(line,b2-a0,clr);  a0=b2;   }
				if(wrd=="001" )  {  wrd="";  mode="H";  toRead=2;  }
				if(U._dmap[wrd]!=null) {  a1 = b1+U._dmap[wrd];  U._addNtimes(line, a1-a0, clr);  a0=a1;  wrd="";  clr=1-clr;  }
			}
		}
		if(wrd.endsWith("000000000001")) // needed for some files
		{
			if(y>=0) U._writeBits(line, tgt, toff*8+y*bipl);
			if(twoDim) {
				if(fo==1) is1D = ((data[boff>>>3]>>>(7-(boff&7)))&1)==1;
				if(fo==2) is1D = ((data[boff>>>3]>>>(  (boff&7)))&1)==1;
				boff++;
			}
			//log("EOL",y, "next 1D:", is1D);
			wrd="";  clr=0;  y++;  a0=0;
			pline=U._makeDiff(line);  line=[];
		}
	}
	if(line.length==w) U._writeBits(line, tgt, toff*8+y*bipl);
}

UTIF.decode._addNtimes = function(arr, n, val) {  for(var i=0; i<n; i++) arr.push(val);  }

UTIF.decode._writeBits = function(bits, tgt, boff)
{
	for(var i=0; i<bits.length; i++) tgt[(boff+i)>>>3] |= (bits[i]<<(7-((boff+i)&7)));
}

UTIF.decode._decodeLZW = function(){var x={},y=function(L,F,i,W,_){for(var a=0;a<_;a+=4){i[W+a]=L[F+a];
i[W+a+1]=L[F+a+1];i[W+a+2]=L[F+a+2];i[W+a+3]=L[F+a+3]}},c=function(L,F,i,W){if(!x.c){var _=new Uint32Array(65535),a=new Uint16Array(65535),Z=new Uint8Array(2e6);
for(var f=0;f<256;f++){Z[f<<2]=f;_[f]=f<<2;a[f]=1}x.c=[_,a,Z]}var o=x.c[0],z=x.c[1],Z=x.c[2],h=258,n=258<<2,k=9,C=F<<3,m=256,B=257,p=0,O=0,K=0;
while(!0){p=L[C>>>3]<<16|L[C+8>>>3]<<8|L[C+16>>>3];O=p>>24-(C&7)-k&(1<<k)-1;C+=k;if(O==B)break;if(O==m){k=9;
h=258;n=258<<2;p=L[C>>>3]<<16|L[C+8>>>3]<<8|L[C+16>>>3];O=p>>24-(C&7)-k&(1<<k)-1;C+=k;if(O==B)break;
i[W]=O;W++}else if(O<h){var J=o[O],q=z[O];y(Z,J,i,W,q);W+=q;if(K>=h){o[h]=n;Z[o[h]]=J[0];z[h]=1;n=n+1+3&~3;
h++}else{o[h]=n;var t=o[K],l=z[K];y(Z,t,Z,n,l);Z[n+l]=Z[J];l++;z[h]=l;h++;n=n+l+3&~3}if(h+1==1<<k)k++}else{if(K>=h){o[h]=n;
z[h]=0;h++}else{o[h]=n;var t=o[K],l=z[K];y(Z,t,Z,n,l);Z[n+l]=Z[n];l++;z[h]=l;h++;y(Z,n,i,W,l);W+=l;n=n+l+3&~3}if(h+1==1<<k)k++}K=O}return W};
return c}();

UTIF.tags = {};
//UTIF.ttypes = {  256:3,257:3,258:3,   259:3, 262:3,  273:4,  274:3, 277:3,278:4,279:4, 282:5, 283:5, 284:3, 286:5,287:5, 296:3, 305:2, 306:2, 338:3, 513:4, 514:4, 34665:4  };
// start at tag 250
UTIF._types = function() {
	var main = new Array(250);  main.fill(0);
	main = main.concat([0,0,0,0,4,3,3,3,3,3,0,0,3,0,0,0,3,0,0,2,2,2,2,4,3,0,0,3,4,4,3,3,5,5,3,2,5,5,0,0,0,0,4,4,0,0,3,3,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,2,2,3,5,5,3,0,3,3,4,4,4,3,4,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
	var rest = {33432: 2, 33434: 5, 33437: 5, 34665: 4, 34850: 3, 34853: 4, 34855: 3, 34864: 3, 34866: 4, 36864: 7, 36867: 2, 36868: 2, 37121: 7, 37377: 10, 37378: 5, 37380: 10, 37381: 5, 37383: 3, 37384: 3, 37385: 3, 37386: 5, 37510: 7, 37520: 2, 37521: 2, 37522: 2, 40960: 7, 40961: 3, 40962: 4, 40963: 4, 40965: 4, 41486: 5, 41487: 5, 41488: 3, 41985: 3, 41986: 3, 41987: 3, 41988: 5, 41989: 3, 41990: 3, 41993: 3, 41994: 3, 41995: 7, 41996: 3, 42032: 2, 42033: 2, 42034: 5, 42036: 2, 42037: 2, 59932: 7};
	return {
		basic: {
			main: main,
			rest: rest
		},
		gps: {
			main: [1,2,5,2,5,1,5,5,0,9],
			rest: {18:2,29:2}
		}
	}
}();

UTIF._readIFD_BigTIFF = function(bin, data, offset, ifds, depth, prm)
{
	var cnt = bin.readUlong(data, offset);  offset+=8n;
	var ifd = {};

	if(prm.debug) log("   ".repeat(depth),ifds.length-1,">>>----------------");
	for(var i=0n; i<cnt; i++)
	{
		var tag  = bin.readUshort(data, offset);    offset+=2n;
		var type = bin.readUshort(data, offset);    offset+=2n;
		var num  = bin.readUlong (data, offset);    offset+=8n;
		var voff = bin.readUlong (data, offset);    offset+=8n;
		console.log(tag, type, num, voff);
		var arr = [];
		//ifd["t"+tag+"-"+UTIF.tags[tag]] = arr;
		if(type== 1 || type==7) {  arr = new Uint8Array(data.buffer, (num<5 ? offset-4 : voff), num);  }
		if(type== 2) {  
            var o0 = (num<9n ? offset-8n : voff);
            console.log('o0 : ', o0);
            var len = num-1n;
            // var c=data[o0];
            // console.log('c : ', c);
            // var len=Math.max(0n, Math.min(num-1n,BigInt(data.length)-o0));
            // console.log(o0, c, len);
            // if(c<128n || len==0n) 
                arr.push( bin.readASCII(data, o0, len) );
            // else
            //     arr = new Uint8Array(data.buffer, o0, len);
        }
		if(type== 3) {  
			for(var j=0n; j<num; j++) {
				arr.push(bin.readUshort(data, (num<5n ? offset-8n : voff)+2n*j));
			}
		}
		if(type== 4 
		|| type==13) {  
            for(var j=0n; j<num; j++) arr.push(bin.readUint  (data, (num<3n ? offset-8n : voff)+4n*j));  
        }
		if(type== 5 || type==10) {  
			var ri = type==5 ? bin.readUint : bin.readInt;
			for(var j=0; j<num; j++) arr.push([ri(data, voff+j*8), ri(data,voff+j*8+4)]);  }
		if(type== 8) {  for(var j=0; j<num; j++) arr.push(bin.readShort (data, (num<3 ? offset-4 : voff)+2*j));  }
		if(type== 9) {  for(var j=0; j<num; j++) arr.push(bin.readInt   (data, (num<2 ? offset-4 : voff)+4*j));  }
		if(type==11) {  for(var j=0; j<num; j++) arr.push(bin.readFloat (data, voff+j*4));  }
        if(type==12) {  
            for(var j=0n; j<num; j++) arr.push(bin.readDouble(data, (num<2n ? offset-8n : voff)+8n*j));
        }
        if(type==16) {  
            for(var j=0n; j<num; j++) arr.push(bin.readUlong(data, (num<2n ? offset-8n : voff)+8n*j));  
        }
		
		ifd["t"+tag] = arr;
		
		if(num!=0 && arr.length==0) {  log(tag, "unknown TIFF tag type: ", type, "num:",num);  if(i==0)return;  continue;  }
		if(prm.debug) log("   ".repeat(depth), tag, type, UTIF.tags[tag], arr);
		
		if(tag==330 && ifd["t272"] && ifd["t272"][0]=="DSLR-A100") {  } 
		else if(tag==330 || tag==34665 || tag==34853 || (tag==50740 && bin.readUshort(data,bin.readUint(arr,0))<300  ) ||tag==61440) {
			var oarr = tag==50740 ? [bin.readUint(arr,0)] : arr;
			var subfd = [];
			for(var j=0; j<oarr.length; j++) UTIF._readIFD_BigTIFF(bin, data, oarr[j], subfd, depth+1, prm);
			if(tag==  330) ifd.subIFD = subfd;
			if(tag==34665) ifd.exifIFD = subfd[0];
			if(tag==34853) ifd.gpsiIFD = subfd[0];  //console.log("gps", subfd[0]);  }
			if(tag==50740) ifd.dngPrvt = subfd[0];
			if(tag==61440) ifd.fujiIFD = subfd[0];
		}
		if(tag==37500 && prm.parseMN) {
			var mn = arr;
			//console.log(bin.readASCII(mn,0,mn.length), mn);
			if(bin.readASCII(mn,0,5)=="Nikon")  ifd.makerNote = UTIF["decode"](mn.slice(10).buffer)[0];
			else if(bin.readUshort(data,voff)<300 && bin.readUshort(data,voff+4)<=12){
				var subsub=[];  UTIF._readIFD_BigTIFF(bin, data, voff, subsub, depth+1, prm);
				ifd.makerNote = subsub[0];
			}
		}
	}
	ifds.push(ifd);
    if(prm.debug) log("   ".repeat(depth),"<<<---------------");
    console.log(ifd);
	return offset;
}


UTIF._readIFD = function(bin, data, offset, ifds, depth, prm)
{
	var cnt = bin.readUshort(data, offset);  offset+=2n;
	var ifd = {};

	if(prm.debug) log("   ".repeat(depth),ifds.length-1,">>>----------------");
	for(var i=0; i<cnt; i++)
	{
		var tag  = bin.readUshort(data, offset);    offset+=2n;
		var type = bin.readUshort(data, offset);    offset+=2n;
		var num  = BigInt(bin.readUint  (data, offset));    offset+=4n;
		var voff = BigInt(bin.readUint  (data, offset));    offset+=4n;
		console.log(tag, type, num, voff);
		var arr = [];
		//ifd["t"+tag+"-"+UTIF.tags[tag]] = arr;
		if(type== 1 || type==7) {  arr = new Uint8Array(data.buffer, (num<5 ? offset-4 : voff), num);  }
		if(type== 2) {  
			var o0 = (num<5n ? offset-4n : voff);
			var c=data[o0];
			var len=Math.max(0, Math.min(num-1,data.length-o0));
			if(c<128 || len==0) 
				arr.push( bin.readASCII(data, o0, len) );
			else
				arr = new Uint8Array(data.buffer, o0, len);  
		}
		if(type== 3) {  
			for(var j=0n; j<num; j++) {
				arr.push(bin.readUshort(data, (num<3n ? offset-4n : voff)+2n*j));
			}  
		}
		if(type== 4 
		|| type==13) {  
			for(var j=0n; j<num; j++) arr.push(bin.readUint  (data, (num<2n ? offset-4n : voff)+4n*j));  
		}
		if(type== 5 || type==10) {  
			var ri = type==5 ? bin.readUint : bin.readInt;
			for(var j=0; j<num; j++) arr.push([ri(data, voff+j*8), ri(data,voff+j*8+4)]);  }
		if(type== 8) {  for(var j=0; j<num; j++) arr.push(bin.readShort (data, (num<3 ? offset-4 : voff)+2*j));  }
		if(type== 9) {  for(var j=0; j<num; j++) arr.push(bin.readInt   (data, (num<2 ? offset-4 : voff)+4*j));  }
		if(type==11) {  for(var j=0; j<num; j++) arr.push(bin.readFloat (data, voff+j*4));  }
		if(type==12) {  
			for(var j=0n; j<num; j++) arr.push(bin.readDouble(data, voff+j*8n));  
		}
		
		ifd["t"+tag] = arr;
		
		if(num!=0 && arr.length==0) {  log(tag, "unknown TIFF tag type: ", type, "num:",num);  if(i==0)return;  continue;  }
		if(prm.debug) log("   ".repeat(depth), tag, type, UTIF.tags[tag], arr);
		
		if(tag==330 && ifd["t272"] && ifd["t272"][0]=="DSLR-A100") {  } 
		else if(tag==330 || tag==34665 || tag==34853 || (tag==50740 && bin.readUshort(data,bin.readUint(arr,0))<300  ) ||tag==61440) {
			var oarr = tag==50740 ? [bin.readUint(arr,0)] : arr;
			var subfd = [];
			for(var j=0; j<oarr.length; j++) UTIF._readIFD(bin, data, oarr[j], subfd, depth+1, prm);
			if(tag==  330) ifd.subIFD = subfd;
			if(tag==34665) ifd.exifIFD = subfd[0];
			if(tag==34853) ifd.gpsiIFD = subfd[0];  //console.log("gps", subfd[0]);  }
			if(tag==50740) ifd.dngPrvt = subfd[0];
			if(tag==61440) ifd.fujiIFD = subfd[0];
		}
		if(tag==37500 && prm.parseMN) {
			var mn = arr;
			//console.log(bin.readASCII(mn,0,mn.length), mn);
			if(bin.readASCII(mn,0,5)=="Nikon")  ifd.makerNote = UTIF["decode"](mn.slice(10).buffer)[0];
			else if(bin.readUshort(data,voff)<300 && bin.readUshort(data,voff+4)<=12){
				var subsub=[];  UTIF._readIFD(bin, data, voff, subsub, depth+1, prm);
				ifd.makerNote = subsub[0];
			}
		}
	}
	ifds.push(ifd);
	if(prm.debug) log("   ".repeat(depth),"<<<---------------");
	return offset;
}

UTIF._writeIFD = function(bin, types, data, offset, ifd)
{
	var keys = Object.keys(ifd), knum=keys.length;  if(ifd["exifIFD"]) knum--;  if(ifd["gpsiIFD"]) knum--;
	bin.writeUshort(data, offset, knum);  offset+=2;

	var eoff = offset + knum*12 + 4;

	for(var ki=0; ki<keys.length; ki++)
	{
		var key = keys[ki];  if(key=="t34665" || key=="t34853") continue;  
		if(key=="exifIFD") key="t34665";  if(key=="gpsiIFD") key="t34853";
		var tag = parseInt(key.slice(1)), type = types.main[tag];  if(type==null) type=types.rest[tag];		
		if(type==null || type==0) throw new Error("unknown type of tag: "+tag);
		//console.log(offset+":", tag, type, eoff);
		var val = ifd[key];  
		if(tag==34665) {
			var outp = UTIF._writeIFD(bin, types, data, eoff, ifd["exifIFD"]);
			val = [eoff];  eoff = outp[1];
		}
		if(tag==34853) {
			var outp = UTIF._writeIFD(bin, UTIF._types.gps, data, eoff, ifd["gpsiIFD"]);
			val = [eoff];  eoff = outp[1];
		}
		if(type==2) val=val[0]+"\u0000";  var num = val.length;
		bin.writeUshort(data, offset, tag );  offset+=2;
		bin.writeUshort(data, offset, type);  offset+=2;
		bin.writeUint  (data, offset, num );  offset+=4;

		var dlen = [-1, 1, 1, 2, 4, 8, 0, 1, 0, 4, 8, 0, 8][type] * num;  //if(dlen<1) throw "e";
		var toff = offset;
		if(dlen>4) {  bin.writeUint(data, offset, eoff);  toff=eoff;  }

		if     (type== 1 || type==7) {  for(var i=0; i<num; i++) data[toff+i] = val[i];  }
		else if(type== 2) {  bin.writeASCII(data, toff, val);   }
		else if(type== 3) {  for(var i=0; i<num; i++) bin.writeUshort(data, toff+2*i, val[i]);    }
		else if(type== 4) {  for(var i=0; i<num; i++) bin.writeUint  (data, toff+4*i, val[i]);    }
		else if(type== 5 || type==10) {  
			var wr = type==5?bin.writeUint:bin.writeInt;
			for(var i=0; i<num; i++) {  
			var v=val[i],nu=v[0],de=v[1];  if(nu==null) throw "e";  wr(data, toff+8*i, nu);  wr(data, toff+8*i+4, de);  }   }
		else if(type== 9) {  for(var i=0; i<num; i++) bin.writeInt   (data, toff+4*i, val[i]);    }
		else if(type==12) {  for(var i=0; i<num; i++) bin.writeDouble(data, toff+8*i, val[i]);    }
		else throw type;

		if(dlen>4) {  dlen += (dlen&1);  eoff += dlen;  }
		offset += 4;
	}
	return [offset, eoff];
}

UTIF.toRGBA8 = function(out)
{
	var w = out.width, h = out.height, area = w*h, qarea = area*4, data = out.data;
	var img = new Uint8Array(area*4);
	//console.log(out);
	// 0: WhiteIsZero, 1: BlackIsZero, 2: RGB, 3: Palette color, 4: Transparency mask, 5: CMYK
	var intp = (out["t262"] ? out["t262"][0]: 2), bps = (out["t258"]?Math.min(32,out["t258"][0]):1);
	//log("interpretation: ", intp, "bps", bps, out);
	if(false) {}
	else if(intp==0)
	{
		var bpl = Math.ceil(bps*w/8);
		for(var y=0; y<h; y++) {
			var off = y*bpl, io = y*w;
			if(bps== 1) for(var i=0; i<w; i++) {  var qi=(io+i)<<2, px=((data[off+(i>>3)])>>(7-  (i&7)))& 1;  img[qi]=img[qi+1]=img[qi+2]=( 1-px)*255;  img[qi+3]=255;    }
			if(bps== 4) for(var i=0; i<w; i++) {  var qi=(io+i)<<2, px=((data[off+(i>>1)])>>(4-4*(i&1)))&15;  img[qi]=img[qi+1]=img[qi+2]=(15-px)* 17;  img[qi+3]=255;    }
			if(bps== 8) for(var i=0; i<w; i++) {  var qi=(io+i)<<2, px=data[off+i];  img[qi]=img[qi+1]=img[qi+2]=255-px;  img[qi+3]=255;    }
		}
	}
	else if(intp==1)
	{
		var smpls = out["t258"]?out["t258"].length : 1;
		var bpl = Math.ceil(smpls*bps*w/8);
		for(var y=0; y<h; y++) {
			var off = y*bpl, io = y*w;
			if(bps== 1) for(var i=0; i<w; i++) {  var qi=(io+i)<<2, px=((data[off+(i>>3)])>>(7-  (i&7)))&1;   img[qi]=img[qi+1]=img[qi+2]=(px)*255;  img[qi+3]=255;    }
			if(bps== 2) for(var i=0; i<w; i++) {  var qi=(io+i)<<2, px=((data[off+(i>>2)])>>(6-2*(i&3)))&3;   img[qi]=img[qi+1]=img[qi+2]=(px)* 85;  img[qi+3]=255;    }
			if(bps== 8) for(var i=0; i<w; i++) {  var qi=(io+i)<<2, px=data[off+i*smpls];  img[qi]=img[qi+1]=img[qi+2]=    px;  img[qi+3]=255;    }
			if(bps==16) for(var i=0; i<w; i++) {  var qi=(io+i)<<2, px=data[off+(2*i+1)];  img[qi]=img[qi+1]=img[qi+2]= Math.min(255,px);  img[qi+3]=255;    } // ladoga.tif
		}
	}
	else if(intp==2)
	{
		var smpls = out["t258"]?out["t258"].length : 3;
		
		if(bps== 8) 
		{
			if(smpls==4) for(var i=0; i<qarea; i++) img[i] = data[i];
			if(smpls==3) for(var i=0; i< area; i++) {  var qi=i<<2, ti=i*3;  img[qi]=data[ti];  img[qi+1]=data[ti+1];  img[qi+2]=data[ti+2];  img[qi+3]=255;    }
		}
		else{  // 3x 16-bit channel
			if(smpls==4) for(var i=0; i<area; i++) {  var qi=i<<2, ti=i*8+1;  img[qi]=data[ti];  img[qi+1]=data[ti+2];  img[qi+2]=data[ti+4];  img[qi+3]=data[ti+6];    }
			if(smpls==3) for(var i=0; i<area; i++) {  var qi=i<<2, ti=i*6+1;  img[qi]=data[ti];  img[qi+1]=data[ti+2];  img[qi+2]=data[ti+4];  img[qi+3]=255;           }
		}
	}
	else if(intp==3)
	{
		var map = out["t320"];
		var smpls = out["t258"]?out["t258"].length : 1;
		for(var i=0; i<area; i++) {  var qi=i<<2, mi=data[i*smpls];  img[qi]=(map[mi]>>8);  img[qi+1]=(map[256+mi]>>8);  img[qi+2]=(map[512+mi]>>8);  img[qi+3]=255;    }
	}
	else if(intp==5) 
	{
		var smpls = out["t258"]?out["t258"].length : 4;
		var gotAlpha = smpls>4 ? 1 : 0;
		for(var i=0; i<area; i++) {
			var qi=i<<2, si=i*smpls;  var C=255-data[si], M=255-data[si+1], Y=255-data[si+2], K=(255-data[si+3])*(1/255);
			img[qi]=~~(C*K+0.5);  img[qi+1]=~~(M*K+0.5);  img[qi+2]=~~(Y*K+0.5);  img[qi+3]=255*(1-gotAlpha)+data[si+4]*gotAlpha;
		}
	}
	else if(intp==6 && out["t278"]) {  // only for DSC_1538.TIF
		var rps = out["t278"][0];
		for(var y=0; y<h; y+=rps) {
			var i=(y*w), len = rps*w;
			
			for(var j=0; j<len; j++) {
				var qi = 4*(i+j), si = 3*i+4*(j>>>1);
				var Y = data[si+(j&1)], Cb=data[si+2]-128, Cr=data[si+3]-128;
				
				var r = Y + ( (Cr >> 2) + (Cr >> 3) + (Cr >> 5) ) ;
				var g = Y - ( (Cb >> 2) + (Cb >> 4) + (Cb >> 5)) - ( (Cr >> 1) + (Cr >> 3) + (Cr >> 4) + (Cr >> 5)) ;
				var b = Y + ( Cb + (Cb >> 1) + (Cb >> 2) + (Cb >> 6)) ;
				
				img[qi  ]=Math.max(0,Math.min(255,r));
				img[qi+1]=Math.max(0,Math.min(255,g));
				img[qi+2]=Math.max(0,Math.min(255,b));
				img[qi+3]=255;
			}
		}
	}
	else log("Unknown Photometric interpretation: "+intp);
	return img;
}

UTIF.replaceIMG = function(imgs)
{
	if(imgs==null) imgs = document.getElementsByTagName("img");
	var sufs = ["tif","tiff","dng","cr2","nef"]
	for (var i=0; i<imgs.length; i++)
	{
		var img=imgs[i], src=img.getAttribute("src");  if(src==null) continue;
		var suff=src.split(".").pop().toLowerCase();
		if(sufs.indexOf(suff)==-1) continue;
		var xhr = new XMLHttpRequest();  UTIF._xhrs.push(xhr);  UTIF._imgs.push(img);
		xhr.open("GET", src);  xhr.responseType = "arraybuffer";
		xhr.onload = UTIF._imgLoaded;   xhr.send();
	}
}

UTIF._xhrs = [];  UTIF._imgs = [];
UTIF._imgLoaded = function(e)
{
	var buff = e.target.response;
	var ifds = UTIF.decode(buff);  //console.log(ifds);
	var vsns = ifds, ma=0, page=vsns[0];  if(ifds[0].subIFD) vsns = vsns.concat(ifds[0].subIFD);
	for(var i=0; i<vsns.length; i++) {
		var img = vsns[i];
		if(img["t258"]==null || img["t258"].length<3) continue;
		var ar = img["t256"]*img["t257"];
		if(ar>ma) {  ma=ar;  page=img;  }
	}
	UTIF.decodeImage(buff, page, ifds);
	var rgba = UTIF.toRGBA8(page), w=page.width, h=page.height;
	var ind = UTIF._xhrs.indexOf(e.target), img = UTIF._imgs[ind];
	UTIF._xhrs.splice(ind,1);  UTIF._imgs.splice(ind,1);
	var cnv = document.createElement("canvas");  cnv.width=w;  cnv.height=h;
	var ctx = cnv.getContext("2d"), imgd = ctx.createImageData(w,h);
	for(var i=0; i<rgba.length; i++) imgd.data[i]=rgba[i];       ctx.putImageData(imgd,0,0);
	img.setAttribute("src",cnv.toDataURL());
}


UTIF._binBE =
{
	nextZero   : function(data, o) {  while(data[o]!=0) o++;  return o;  },
	readUshort : function(buff, p) {  return (buff[p]<< 8) |  buff[p+1n];  },
	readShort  : function(buff, p) {  var a=UTIF._binBE.ui8;  a[0]=buff[p+1n];  a[1]=buff[p+0n];                                    return UTIF._binBE. i16[0];  },
	readInt    : function(buff, p) {  var a=UTIF._binBE.ui8;  a[0]=buff[p+3n];  a[1]=buff[p+2n];  a[2]=buff[p+1n];  a[3]=buff[p+0n];  return UTIF._binBE. i32[0];  },
	readUint   : function(buff, p) {  var a=UTIF._binBE.ui8;  a[0]=buff[p+3n];  a[1]=buff[p+2n];  a[2]=buff[p+1n];  a[3]=buff[p+0n];  return UTIF._binBE.ui32[0];  },
	readUlong  : function(buff, p) {  var a=UTIF._binBE.ui8;  a[0]=buff[p+7n];  a[0]=buff[p+6n];  a[0]=buff[p+5n];  a[0]=buff[p+4n];  a[0]=buff[p+3n];  a[1]=buff[p+2n];  a[2]=buff[p+1n];  a[3]=buff[p+0n];  return UTIF._binBE.ui64[0];  },	
	readUchar  : function(buff, p) {  return buff[p]; },
	readASCII  : function(buff, p, l) {  var s = "";   for(var i=0n; i<l; i++) s += String.fromCharCode(buff[p+i]);   return s; },
	readFloat  : function(buff, p) {  var a=UTIF._binBE.ui8;  for(var i=0n;i<4n;i++) a[i]=buff[p+3n-i];  return UTIF._binBE.fl32[0];  },
	readDouble : function(buff, p) {  var a=UTIF._binBE.ui8;  for(var i=0n;i<8n;i++) a[i]=buff[p+7n-i];  return UTIF._binBE.fl64[0];  },

	writeUshort: function(buff, p, n) {  buff[p] = (n>> 8)&255;  buff[p+1] =  n&255;  },
	writeInt   : function(buff, p, n) {  var a=UTIF._binBE.ui8;  UTIF._binBE.i32[0]=n;  buff[p+3n]=a[0];  buff[p+2n]=a[1];  buff[p+1n]=a[2];  buff[p+0n]=a[3];  },
	writeUint  : function(buff, p, n) {  buff[p] = (n>>24)&255;  buff[p+1n] = (n>>16)&255;  buff[p+2n] = (n>>8)&255;  buff[p+3n] = (n>>0)&255;  },
	writeASCII : function(buff, p, s) {  for(var i = 0n; i < s.length; i++)  buff[p+i] = s.charCodeAt(i);  },
	writeDouble: function(buff, p, n)
	{
		UTIF._binBE.fl64[0] = n;
		for (var i = 0n; i < 8n; i++) buff[p + i] = UTIF._binBE.ui8[7n - i];
	}
}
UTIF._binBE.ui8  = new Uint8Array  (8);
UTIF._binBE.i16  = new Int16Array  (UTIF._binBE.ui8.buffer);
UTIF._binBE.i32  = new Int32Array  (UTIF._binBE.ui8.buffer);
UTIF._binBE.ui32 = new Uint32Array (UTIF._binBE.ui8.buffer);
UTIF._binBE.ui64 = new BigUint64Array (UTIF._binBE.ui8.buffer);
UTIF._binBE.fl32 = new Float32Array(UTIF._binBE.ui8.buffer);
UTIF._binBE.fl64 = new Float64Array(UTIF._binBE.ui8.buffer);

UTIF._binLE =
{
	nextZero   : UTIF._binBE.nextZero,
	readUshort : function(buff, p) {  return (buff[p+1n]<< 8) |  buff[p];  },
	readShort  : function(buff, p) {  var a=UTIF._binBE.ui8;  a[0]=buff[p+0n];  a[1]=buff[p+1n];                                    return UTIF._binBE. i16[0];  },
	readInt    : function(buff, p) {  var a=UTIF._binBE.ui8;  a[0]=buff[p+0n];  a[1]=buff[p+1n];  a[2]=buff[p+2n];  a[3]=buff[p+3n];  return UTIF._binBE. i32[0];  },
	readUint   : function(buff, p) {  var a=UTIF._binBE.ui8;  a[0]=buff[p+0n];  a[1]=buff[p+1n];  a[2]=buff[p+2n];  a[3]=buff[p+3n];  return UTIF._binBE.ui32[0];  },
	readUlong  : function(buff, p) {  
		var a=UTIF._binBE.ui8;  
		a[0]=buff[p+0n]; 
		a[1]=buff[p+1n];
		a[2]=buff[p+2n];
		a[3]=buff[p+3n];
		a[4]=buff[p+4n];
		a[5]=buff[p+5n];
		a[6]=buff[p+6n];
		a[7]=buff[p+7n];
		// console.log(a);
		return UTIF._binBE.ui64[0];  },	
	readUchar  : UTIF._binBE.readUchar,
	readASCII  : UTIF._binBE.readASCII,
	readFloat  : function(buff, p) {  var a=UTIF._binBE.ui8;  for(var i=0n;i<4n;i++) a[i]=buff[p+  i];  return UTIF._binBE.fl32[0];  },
	readDouble : function(buff, p) {  var a=UTIF._binBE.ui8;  for(var i=0n;i<8n;i++) a[i]=buff[p+  i];  return UTIF._binBE.fl64[0];  },
	
	writeUshort: function(buff, p, n) {  buff[p] = (n)&255;  buff[p+1n] =  (n>>8)&255;  },
	writeInt   : function(buff, p, n) {  var a=UTIF._binBE.ui8;  UTIF._binBE.i32[0]=n;  buff[p+0n]=a[0];  buff[p+1n]=a[1];  buff[p+2n]=a[2];  buff[p+3]=a[3];  },
	writeUint  : function(buff, p, n) {  buff[p] = (n>>>0)&255;  buff[p+1n] = (n>>>8)&255;  buff[p+2n] = (n>>>16)&255;  buff[p+3n] = (n>>>24)&255;  },
	writeASCII : UTIF._binBE.writeASCII
}
UTIF._copyTile = function(tb, tw, th, b, w, h, xoff, yoff)
{
	//log("copyTile", tw, th,  w, h, xoff, yoff);
	var xlim = Math.min(tw, w-xoff);
	var ylim = Math.min(th, h-yoff);
	for(var y=0; y<ylim; y++)
	{
		var tof = (yoff+y)*w+xoff;
		var sof = y*tw;
		for(var x=0; x<xlim; x++) b[tof+x] = tb[sof+x];
	}
}

UTIF.LosslessJpegDecode = (function(){function t(Z){this.w=Z;this.N=0;this._=0;this.G=0}t.prototype={t:function(Z){this.N=Math.max(0,Math.min(this.w.length,Z))},i:function(){return this.w[this.N++]},l:function(){var Z=this.N;
this.N+=2;return this.w[Z]<<8|this.w[Z+1]},J:function(){if(this._==0){this.G=this.w[this.N];this.N+=1+(this.G+1>>>8);
this._=8}return this.G>>>--this._&1},Z:function(Z){var X=this._,s=this.G,E=Math.min(X,Z);Z-=E;X-=E;var Y=s>>>X&(1<<E)-1;
while(Z>0){s=this.w[this.N];this.N+=1+(s+1>>>8);E=Math.min(8,Z);Z-=E;X=8-E;Y<<=E;Y|=s>>>X&(1<<E)-1}this._=X;
this.G=s;return Y}};var i={};i.X=function(){return[0,0,-1]};i.s=function(Z,X,s){Z[i.Y(Z,0,s)+2]=X};i.Y=function(Z,X,s){if(Z[X+2]!=-1)return 0;
if(s==0)return X;for(var E=0;E<2;E++){if(Z[X+E]==0){Z[X+E]=Z.length;Z.push(0);Z.push(0);Z.push(-1)}var Y=i.Y(Z,Z[X+E],s-1);
if(Y!=0)return Y}return 0};i.B=function(Z,X){var s=0,E=0,Y=0,B=X._,$=X.G,e=X.N;while(!0){if(B==0){$=X.w[e];
e+=1+($+1>>>8);B=8}Y=$>>>--B&1;s=Z[s+Y];E=Z[s+2];if(E!=-1){X._=B;X.G=$;X.N=e;return E}}return-1};function l(Z){this.z=new t(Z);
this.D(this.z)}l.prototype={$:function(Z,X){this.Q=Z.i();this.F=Z.l();this.o=Z.l();var s=this.O=Z.i();
this.L=[];for(var E=0;E<s;E++){var Y=Z.i(),B=Z.i();Z.i();this.L[Y]=E}Z.t(Z.N+X-(6+s*3))},e:function(){var Z=0,X=this.z.i();
if(this.H==null)this.H={};var s=this.H[X]=i.X(),E=[];for(var Y=0;Y<16;Y++){E[Y]=this.z.i();Z+=E[Y]}for(var Y=0;
Y<16;Y++)for(var B=0;B<E[Y];B++)i.s(s,this.z.i(),Y+1);return Z+17},W:function(Z){while(Z>0)Z-=this.e()},p:function(Z,X){var s=Z.i();
if(!this.U){this.U=[]}for(var E=0;E<s;E++){var Y=Z.i(),B=Z.i();this.U[this.L[Y]]=this.H[B>>>4]}this.g=Z.i();
Z.t(Z.N+X-(2+s*2))},D:function(Z){var X=!1,s=Z.l();if(s!==l.q)return;do{var s=Z.l(),E=Z.l()-2;switch(s){case l.m:this.$(Z,E);
break;case l.K:this.W(E);break;case l.V:this.p(Z,E);X=!0;break;default:Z.t(Z.N+E);break}}while(!X)},I:function(Z,X){var s=i.B(X,Z);
if(s==16)return-32768;var E=Z.Z(s);if((E&1<<s-1)==0)E-=(1<<s)-1;return E},B:function(Z,X){var s=this.z,E=this.O,Y=this.F,B=this.I,$=this.g,e=this.o*E,W=this.U;
for(var p=0;p<E;p++){Z[p]=B(s,W[p])+(1<<this.Q-1)}for(var D=E;D<e;D+=E){for(var p=0;p<E;p++)Z[D+p]=B(s,W[p])+Z[D+p-E]}var I=X;
for(var m=1;m<Y;m++){for(var p=0;p<E;p++){Z[I+p]=B(s,W[p])+Z[I+p-X]}for(var D=E;D<e;D+=E){for(var p=0;
p<E;p++){var K=I+D+p,q=Z[K-E];if($==6)q=Z[K-X]+(q-Z[K-E-X]>>>1);Z[K]=q+B(s,W[p])}}I+=X}}};l.m=65475;
l.K=65476;l.q=65496;l.V=65498;function J(Z){var X=new l(Z),s=X.Q>8?Uint16Array:Uint8Array,E=new s(X.o*X.F*X.O),Y=X.o*X.O;
X.B(E,Y);return E}return J}())




})(UTIF, pako);
})();