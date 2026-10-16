// The orography "X-ray" for status reports (Luis, s1235): the land alone — elevation colours with hill shading and
// contour lines, slope steepness, water depth with flow arrows, snow, the frost line, and the faults of recent quakes.
// No creatures, no reef, no grass. Writes data/orography.html (data embedded); photograph it with the browser skill:
//   node tools/orography.mjs
//   node <browser-automation skill>/browser.mjs "file://$PWD/data/orography.html" --timeout 15000 --script tools/orography-shot.mjs
// which saves reports/status/img/latest-orography.png (rename it to <report>-orography.png).
import fs from 'fs';
const { World, GW, GH, W, H, CELL } = await import(process.cwd() + '/sim/world.mjs');
const w = new World(JSON.parse(fs.readFileSync('data/world.json', 'utf8'))); w.log = () => {};
const n = GW * GH, era = w.tempEra();
const elev = new Float32Array(n), temp = new Float32Array(n), steep = new Float32Array(n);
for (let i = 0; i < n; i++) {
  const x = (i % GW + 0.5) * CELL, y = ((i / GW | 0) + 0.5) * CELL;
  elev[i] = w.elevAt(x, y); temp[i] = w.tempAt(y, era, x); steep[i] = w.steepAt(x, y);
}
// Where each wet cell's water goes: the steepest way down, as the world routes it (the same tilt profile).
const P = { tiltTop: 0.15, tiltHalf: 0.01 }, water = w.water ?? new Float32Array(n), flow = [];
const at = (x, y) => ((y + GH) % GH) * GW + ((x + GW) % GW);
for (let i = 0; i < n; i++) {
  if (!(water[i] > 0.005)) continue;
  const gx = i % GW, gy = i / GW | 0, tilt = gy < GH / 2 ? P.tiltTop + (P.tiltHalf - P.tiltTop) * gy / (GH / 2) : P.tiltHalf;
  const s0 = elev[i] + water[i]; let best = null, steepest = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const j = at(gx + dx, gy + dy), s = (s0 - (elev[j] + water[j] - tilt * dy)) / (dx && dy ? Math.SQRT2 : 1);
    if (s > steepest) { steepest = s; best = [dx, dy]; }
  }
  if (best && (gx + gy) % 2 === 0) flow.push([gx, gy, best[0], best[1], +water[i].toFixed(3)]);
}
const pack = a => Array.from(a, v => Math.round(v * 1000) / 1000);
const data = { GW, GH, W, H, CELL, season: w.season, elev: pack(elev), temp: pack(temp), steep: pack(steep), water: pack(water), snow: pack(w.snow ?? []),
  carve: pack(w.carve ?? []), frost: 0.18, flow, quakes: (w.quakeLog ?? []).slice(-10), ridgeY: 0.65 * H, riverX: 0.32 * W };
const html = `<!doctype html><meta charset=utf-8><title>Orography</title><body style="margin:0;background:#1b1f1c;font:13px Menlo,monospace;color:#ddd">
<canvas id=c width=${W} height=${H + 70}></canvas><script>
const D=${JSON.stringify(data)};const c=document.getElementById('c'),g=c.getContext('2d');
const s=document.createElement('canvas');s.width=D.GW;s.height=D.GH;const sg=s.getContext('2d'),img=sg.createImageData(D.GW,D.GH);
const at=(x,y)=>((y+D.GH)%D.GH)*D.GW+((x+D.GW)%D.GW), E=(x,y)=>D.elev[at(x,y)];
let lo=Infinity,hi=-Infinity;for(const v of D.elev){lo=Math.min(lo,v);hi=Math.max(hi,v);}
// hypsometric tint: low olive → tan → brown → grey → white summit; below the old ground (carved, sunk) a little bluer
const ramp=[[-0.35,[60,80,95]],[0,[92,112,74]],[0.2,[150,140,92]],[0.45,[150,112,72]],[0.7,[140,132,124]],[1,[240,240,240]]];
const tint=v=>{for(let k=1;k<ramp.length;k++){if(v<=ramp[k][0]){const [a,ca]=ramp[k-1],[b,cb]=ramp[k],t=Math.max(0,Math.min(1,(v-a)/(b-a)));return ca.map((x,j)=>x+(cb[j]-x)*t);}}return ramp.at(-1)[1];};
for(let y=0;y<D.GH;y++)for(let x=0;x<D.GW;x++){const i=y*D.GW+x,o=i*4,v=D.elev[i];let [r,gg,b]=tint(v);
 const sh=Math.max(-1,Math.min(1,(E(x-1,y)-E(x+1,y)+E(x,y-1)-E(x,y+1))*8));r*=1+sh*0.45;gg*=1+sh*0.45;b*=1+sh*0.45;
 const st=Math.min(1,D.steep[i]/0.02);r=r*(1-0.35*st)+120*0.35*st;gg=gg*(1-0.35*st)+40*0.35*st;b=b*(1-0.35*st)+40*0.35*st; // steep ground reddens
 if(D.snow[i]>0.003){const a=Math.min(0.45,D.snow[i]*40)*((x+y)%2?1:0.6);r+=(255-r)*a;gg+=(255-gg)*a;b+=(255-b)*a;}
 img.data[o]=r;img.data[o+1]=gg;img.data[o+2]=b;img.data[o+3]=255;}
sg.putImageData(img,0,0);g.imageSmoothingEnabled=true;g.drawImage(s,0,0,D.W,D.H);
const k=D.CELL;
// contour lines every 0.1 of height (thicker every 0.5); the frost line dashed white
g.lineWidth=1;for(let y=0;y<D.GH;y++)for(let x=0;x<D.GW;x++){const a=D.elev[at(x,y)],b=D.elev[at(x+1,y)],c2=D.elev[at(x,y+1)];
 for(const [nb,dx,dy] of [[b,1,0],[c2,0,1]]){if(Math.floor(a*10)!==Math.floor(nb*10)){const major=Math.floor(Math.max(a,nb)*10)%5===0,under=Math.max(a,nb)<0.05;g.strokeStyle=major?'rgba(30,20,10,.9)':under?'rgba(30,40,60,.18)':'rgba(30,20,10,.45)';g.lineWidth=major?1.6:0.8;g.beginPath();if(dx){g.moveTo((x+1)*k,y*k);g.lineTo((x+1)*k,(y+1)*k);}else{g.moveTo(x*k,(y+1)*k);g.lineTo((x+1)*k,(y+1)*k);}g.stroke();}}
 const ta=D.temp[at(x,y)],tb=D.temp[at(x+1,y)];if((ta<D.frost)!==(tb<D.frost)){g.strokeStyle='rgba(255,255,255,.9)';g.setLineDash([3,3]);g.beginPath();g.moveTo((x+1)*k,y*k);g.lineTo((x+1)*k,(y+1)*k);g.stroke();g.setLineDash([]);}}
// water: blue by depth, and flow arrows
for(let i=0;i<D.water.length;i++){const d=D.water[i];if(d<=0.005)continue;const x=i%D.GW,y=i/D.GW|0;g.fillStyle='rgba(40,120,230,'+Math.min(0.9,0.35+d*8)+')';g.fillRect(x*k,y*k,k,k);}
g.strokeStyle='rgba(230,245,255,.9)';g.lineWidth=1.2;for(const [x,y,dx,dy,d] of D.flow){const cx=(x+0.5)*k,cy=(y+0.5)*k,l=5+Math.min(6,d*120),len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;
 g.beginPath();g.moveTo(cx-ux*l/2,cy-uy*l/2);g.lineTo(cx+ux*l/2,cy+uy*l/2);g.lineTo(cx+ux*l/2-ux*3-uy*2,cy+uy*l/2-uy*3+ux*2);g.stroke();}
// quake faults (most recent strongest)
D.quakes.forEach((q,j)=>{const ux=Math.cos(q.ang),uy=Math.sin(q.ang),a=0.4+0.6*(j+1)/D.quakes.length;g.strokeStyle='rgba(255,60,40,'+a+')';g.lineWidth=q.big?3:2;g.beginPath();g.moveTo(q.x-ux*q.len/2,q.y-uy*q.len/2);g.lineTo(q.x+ux*q.len/2,q.y+uy*q.len/2);g.stroke();g.fillStyle='rgba(255,60,40,'+a+')';g.fillText((q.big?'great quake':'quake')+' s'+q.season,q.x+6,q.y-6);});
// legend
g.fillStyle='#1b1f1c';g.fillRect(0,D.H,D.W,70);g.fillStyle='#ddd';
g.fillText('ORGRAPHY · season '+D.season+' · elevation '+lo.toFixed(2)+' … '+hi.toFixed(2)+' · contours every 0.1 (bold 0.5) · dashed white = frost line · red tint = steep',10,D.H+18);
g.fillText('blue = water (darker = deeper) · white arrows = flow · white speckle = snow · bluish = carved below the old ground · red lines = quake faults (latest brightest)',10,D.H+38);
for(let j=0;j<=20;j++){const v=-0.3+j*1.3/20;const [r,gg,b]=tint(v);g.fillStyle='rgb('+r+','+gg+','+b+')';g.fillRect(10+j*22,D.H+48,22,14);}g.fillStyle='#ddd';g.fillText('-0.3',10,D.H+68);g.fillText('1.0',440,D.H+68);
</script>`.replace('ORGRAPHY', 'OROGRAPHY');
fs.writeFileSync('data/orography.html', html);
console.log(`data/orography.html · season ${w.season} · elevation ${Math.min(...elev).toFixed(2)}…${Math.max(...elev).toFixed(2)} · wet cells ${water.filter(v => v > 0.005).length} · quakes logged ${data.quakes.length}`);
