
(function(){
"use strict";
const $=id=>document.getElementById(id);
const cities=window.APOCA_CITIES||[];
const s={map:null,selected:null,anchor:null,phase:"idle",marker:null,circles:[],start:0,referenceZoom:12,frame:0,hold:false,duration:28000,drawTime:0,fxCtx:null,fxWidth:0,fxHeight:0,dpr:1};
const state=(phase,message)=>{s.phase=phase;$("phaseLabel").textContent=({idle:"WAITING FOR SELECTION",selected:"LOCATION SELECTED",playing:"PLAYBACK LOCKED",finished:"VISUAL COMPLETE"})[phase];$("phaseDetail").textContent=message;};
const status=(message)=>{$("mapStatus").textContent=message;};
const clearVisual=()=>{s.hold=false;s.anchor=null;const c=$("fx");const ctx=c.getContext("2d");ctx.clearRect(0,0,c.width,c.height);};
function setRulers(latlng){
s.circles.forEach(c=>s.map.removeLayer(c));s.circles=[];
[1000,3000,5000].forEach((radius,i)=>s.circles.push(L.circle(latlng,{radius,color:["#62e2ce","#c6d3ec","#ffb27e"][i],weight:1.7,opacity:.84,fillColor:"#ff8b4e",fillOpacity:.025,interactive:false,dashArray:"6 7"}).addTo(s.map)));
}
function select(latlng){
if(s.phase==="playing"){status("Playback locked — wait until it finishes.");return;}
clearVisual();
s.selected=Object.freeze({lat:latlng.lat,lng:latlng.lng});
setRulers([s.selected.lat,s.selected.lng]);
if(s.marker)s.map.removeLayer(s.marker);
s.marker=L.marker([s.selected.lat,s.selected.lng],{interactive:false,keyboard:false,icon:L.divIcon({className:"",html:'<div class="selected-pin"></div>',iconSize:[16,16],iconAnchor:[8,8]})}).addTo(s.map);
$("latitude").textContent=s.selected.lat.toFixed(5);
$("longitude").textContent=s.selected.lng.toFixed(5);
$("play").disabled=false;$("share").disabled=false;
$("actionInfo").textContent="Precise location selected. Press Play.";
state("selected","This geographic point is selected. Play freezes it until the full animation finishes.");
status("Selected by map click • ready to play");
}
function readURL(){
let p=new URLSearchParams(location.search),lat=Number(p.get("lat")),lng=Number(p.get("lng")),z=Number(p.get("z"));
if(p.has("lat")&&p.has("lng")&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=85&&Math.abs(lng)<=180){
s.map.setView([lat,lng],Number.isFinite(z)&&z>=2&&z<=18?z:12);
select({lat,lng});status("Shared point restored • press Play when ready");
}
}
function share(){
const p=s.selected||s.anchor;if(!p)return;
const url=new URL(location.href);url.search="";url.searchParams.set("lat",p.lat.toFixed(5));url.searchParams.set("lng",p.lng.toFixed(5));url.searchParams.set("z",String(s.map.getZoom()));
if(navigator.clipboard&&window.isSecureContext){
navigator.clipboard.writeText(url.toString()).then(()=>{$("actionInfo").textContent="Share URL copied."}).catch(()=>prompt("Copy your share URL:",url.toString()));
}else{prompt("Copy your share URL:",url.toString());}
history.replaceState({},"",url.toString());
}
function navigate(term){
let q=term.toLocaleLowerCase().trim();
let found=cities.find(c=>c[0].toLocaleLowerCase()===q)||cities.find(c=>c[0].toLocaleLowerCase().includes(q));
if(!found){$("actionInfo").textContent="Only 20 indexed cities are available in this demo. Click anywhere for a precise selection.";return;}
s.map.flyTo([found[1],found[2]],12,{duration:1.1});status("Navigated to "+found[0]+" • now click the map");
$("actionInfo").textContent="Search moved the camera only; your selected position was not changed.";
}
function fit(){
const b=$("map").getBoundingClientRect(),ratio=Math.min(2,window.devicePixelRatio||1),canvas=$("fx");
let w=Math.max(1,Math.floor(b.width)),h=Math.max(1,Math.floor(b.height));
if(w!==s.fxWidth||h!==s.fxHeight||ratio!==s.dpr){
s.fxWidth=w;s.fxHeight=h;s.dpr=ratio;
canvas.width=Math.floor(w*ratio);canvas.height=Math.floor(h*ratio);
canvas.style.width=w+"px";canvas.style.height=h+"px";
}
s.fxCtx=canvas.getContext("2d");s.fxCtx.setTransform(ratio,0,0,ratio,0,0);
}
const clamp=(t)=>Math.min(1,Math.max(0,t));
const smooth=(t)=>{t=clamp(t);return t*t*(3-2*t);};
const rand=(n)=>{let x=Math.sin(n*83.72+34.1)*43758.5453;return x-Math.floor(x);};
const texture={};
function puffImage(warm){
let key=warm?"warm":"slate";if(texture[key])return texture[key];
const can=document.createElement("canvas");can.width=96;can.height=96;const ctx=can.getContext("2d");
let g=ctx.createRadialGradient(37,30,2,48,48,47);
g.addColorStop(0,warm?"rgba(255,213,174,.93)":"rgba(235,232,225,.92)");
g.addColorStop(.3,warm?"rgba(191,156,139,.86)":"rgba(183,188,191,.85)");
g.addColorStop(.68,warm?"rgba(102,98,109,.55)":"rgba(88,99,114,.64)");
g.addColorStop(1,"rgba(42,55,75,0)");
ctx.fillStyle=g;ctx.fillRect(0,0,96,96);texture[key]=can;return can;
}
function puff(ctx,x,y,size,alpha,warm,stretch=1){
ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);ctx.scale(size,size*stretch);
ctx.drawImage(puffImage(warm),-.5,-.5,1,1);ctx.restore();
}
function drawRing(ctx,x,y,radius,fade,flatten){
if(fade<=0)return;
ctx.save();ctx.translate(x,y);ctx.scale(1,flatten);
ctx.shadowBlur=14;ctx.shadowColor="rgba(255,118,66,.65)";
ctx.strokeStyle="rgba(255,196,131,"+(.65*fade)+")";ctx.lineWidth=4;
ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke();
ctx.strokeStyle="rgba(240,236,204,"+(.3*fade)+")";ctx.lineWidth=10;
ctx.beginPath();ctx.arc(0,0,radius+13,0,Math.PI*2);ctx.stroke();
ctx.restore();
}
function cloud(ctx,x,y,scale,t){
let progress=smooth((t-.02)/.82);
if(progress<=0)return;
let width=440*scale*(.12+.88*progress),height=330*scale*(.07+.93*progress),cap=y-height*.75;
ctx.save();
for(let i=0;i<31;i++){
let k=i/30,r=width*(.05+.04*k);
puff(ctx,x+(rand(i+60)-.5)*width*(.11+.2*k),y-height*(.02+.73*k),r,.75,i%7===0,1.15);
}
for(let i=0;i<82;i++){
const a=rand(i+310)*Math.PI*2,rad=Math.sqrt(rand(i+200));
let px=x+Math.cos(a)*rad*width*.45,py=cap+Math.sin(a)*rad*height*.19;
puff(ctx,px,py,width*(.045+.037*rand(i+330)),.77,i%6===0,.76+.3*rand(i+390));
}
for(let i=0;i<32;i++){
let a=2*Math.PI*i/32;
puff(ctx,x+Math.cos(a)*width*.44,cap+Math.sin(a)*height*.16,width*(.055+.02*rand(i+420)),.85,i%5===0,.78);
}
for(let i=0;i<19;i++){
let px=x+(rand(i+500)-.5)*width*.85,py=y+height*(.03+rand(i+510)*.07);
puff(ctx,px,py,width*(.055+.04*rand(i+520)),.51,i%4===0,.48);
}
ctx.restore();
}
function paint(t){
fit();const ctx=s.fxCtx;ctx.clearRect(0,0,s.fxWidth,s.fxHeight);
if(!s.anchor||!s.map)return;
const p=s.map.latLngToContainerPoint([s.anchor.lat,s.anchor.lng]);
if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
const scale=Math.max(.07,Math.min(11,Math.pow(2,s.map.getZoom()-s.referenceZoom)));
if(p.x<-900*scale||p.x>s.fxWidth+900*scale||p.y<-900*scale||p.y>s.fxHeight+900*scale)return;
const x=p.x,y=p.y;
let light=1-smooth(t/.27);
if(light>0){
let g=ctx.createRadialGradient(x,y,2,x,y,145*scale);
g.addColorStop(0,"rgba(255,244,203,"+(.7*light)+")");
g.addColorStop(.4,"rgba(255,145,64,"+(.48*light)+")");
g.addColorStop(1,"rgba(255,117,45,0)");
ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,145*scale,0,2*Math.PI);ctx.fill();
}
[[.03,.85],[.15,.68],[.29,.54]].forEach(([delay,size])=>{
let q=(t-delay)/.75;if(q>0&&q<1){
drawRing(ctx,x,y,(20+550*size*smooth(q))*scale,Math.pow(1-q,.7),.5);
}});
cloud(ctx,x,y,scale,t);
}
function tick(now){
if(s.phase!=="playing")return;
if(now-s.drawTime<33){s.frame=requestAnimationFrame(tick);return;}
s.drawTime=now;
const elapsed=clamp((now-s.start)/s.duration);
paint(elapsed);
if(elapsed<1){s.frame=requestAnimationFrame(tick);}
else{
s.hold=true;s.selected=null;state("finished","The geographic anchor is still fixed. The cloud remains visible until you click a new location.");
$("play").disabled=true;$("actionInfo").textContent="Finished. Click a NEW point to reset and enable Play.";
paint(1);
}}
function play(){
if(s.phase!=="selected"||!s.selected)return;
cancelAnimationFrame(s.frame);
s.anchor=Object.freeze({lat:s.selected.lat,lng:s.selected.lng});
s.referenceZoom=s.map.getZoom();s.start=performance.now();s.drawTime=0;s.hold=false;
state("playing","Immutable location is locked. Other clicks cannot change it. Camera movement and zoom remain enabled.");
$("play").disabled=true;$("actionInfo").textContent="28-second animation running. Selection locked.";
s.frame=requestAnimationFrame(tick);
}
document.addEventListener("DOMContentLoaded",()=>{
if(typeof L==="undefined"){$("mapStatus").textContent="Map library unavailable on this network";return;}
s.map=L.map("map",{zoomControl:true,preferCanvas:true,worldCopyJump:true}).setView([40.7128,-74.006],11);
const tile=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',minZoom:2,maxZoom:18,referrerPolicy:"strict-origin-when-cross-origin"});
tile.addTo(s.map);
tile.on("load",()=>{$("fallback").style.display="none";});
tile.on("tileerror",()=>{$("mapStatus").textContent="Tile service did not respond. Check map connection.";});
s.map.on("click",e=>select(e.latlng));
s.map.on("zoom move resize",()=>{
$("zoom").textContent=s.map.getZoom();
if(s.phase==="playing"&&s.anchor)paint(clamp((performance.now()-s.start)/s.duration));
else if(s.hold)paint(1);
});
$("zoom").textContent=s.map.getZoom();
$("go").addEventListener("click",()=>navigate($("findCity").value));
$("findCity").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();navigate($("findCity").value);}});
document.querySelectorAll(".quickCity").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.name)));
$("play").addEventListener("click",play);$("share").addEventListener("click",share);
addEventListener("resize",()=>{if(s.hold)paint(1);});
readURL();
});
})();
