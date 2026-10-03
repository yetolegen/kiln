const FINGERS = [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]];
let rimCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;

/** Outline of the silhouette only: stroke all capsules, erase the filled interior, composite the hand's box. */
function drawOuterRim(ctx: CanvasRenderingContext2D, path: Path2D, points: Float32Array, edge: number, color: string, alpha: number): void {
  const t = ctx.getTransform(), w = ctx.canvas.width, h = ctx.canvas.height;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < 42; i += 2) { minX = Math.min(minX, points[i]); maxX = Math.max(maxX, points[i]); minY = Math.min(minY, points[i + 1]); maxY = Math.max(maxY, points[i + 1]); }
  const pad = 60, scale = Math.hypot(t.a, t.b) || 1;
  const sx = Math.max(0, Math.floor((minX - pad) * scale + t.e)), sy = Math.max(0, Math.floor((minY - pad) * scale + t.f));
  const sw = Math.min(w, Math.ceil((maxX + pad) * scale + t.e)) - sx, sh = Math.min(h, Math.ceil((maxY + pad) * scale + t.f)) - sy;
  if (sw <= 0 || sh <= 0) return;
  if (!rimCanvas || rimCanvas.width < w || rimCanvas.height < h) rimCanvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const off = rimCanvas.getContext('2d') as CanvasRenderingContext2D | null;
  if (!off) return;
  off.setTransform(1, 0, 0, 1, 0, 0); off.clearRect(sx, sy, sw, sh);
  off.setTransform(t); off.lineCap = off.lineJoin = 'round';
  off.globalCompositeOperation = 'source-over'; off.strokeStyle = color; off.lineWidth = edge * 2; off.stroke(path);
  off.globalCompositeOperation = 'destination-out'; off.fill(path); off.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha;
  ctx.drawImage(rimCanvas as CanvasImageSource, sx, sy, sw, sh, sx, sy, sw, sh);
  ctx.restore();
}

/** A single filled silhouette from the existing landmarks; never used as input geometry. */
export function drawHandGlove(ctx: CanvasRenderingContext2D, points: Float32Array, opacity: number, active = false, flash = false, error = false, skeleton = false): void {
  const acrossX=points[10]-points[34], acrossY=points[11]-points[35];
  const span=Math.hypot(acrossX,acrossY), palmLength=Math.hypot(points[0]-points[18],points[1]-points[19]);
  if (!Number.isFinite(span+palmLength) || palmLength<1 || opacity<=0) return;
  // Widths come from this hand's own knuckle spacing (no fixed size cap), so the glove scales with the real hand
  // at any distance from the camera and keeps human proportions: broad thumb, slim little finger, tapering tips.
  const knuckleGap=Math.max(span/3, palmLength*.18), base=Math.max(6, knuckleGap*.98);
  const FINGER_SCALE=[1.12, .96, 1, .92, .78];
  const width=base;
  const edge=Math.max(1.5,Math.min(4.5,base*.12));
  const path=new Path2D(), dx=acrossX/(span||1),dy=acrossY/(span||1);
  // Palm outline through the real wrist sides, thumb base and every knuckle.
  const palm=[{x:points[0]+dx*span*.3,y:points[1]+dy*span*.3},
    ...[1,2,5,9,13,17].map(i=>({x:points[i*2],y:points[i*2+1]})),
    {x:points[0]-dx*span*.3,y:points[1]-dy*span*.3}];
  // Match capsule winding on both mirrored hands so overlapping fills cannot cut holes.
  const area=palm.reduce((sum,p,i)=>{const q=palm[(i+1)%palm.length];return sum+p.x*q.y-q.x*p.y;},0);
  if(area<0) palm.reverse();
  const last=palm.at(-1)!;path.moveTo((last.x+palm[0].x)/2,(last.y+palm[0].y)/2);
  for(let i=0;i<palm.length;i++){const p=palm[i],q=palm[(i+1)%palm.length];path.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2);}
  path.closePath();
  FINGERS.forEach((chain,f)=>{ for(let j=0;j<3;j++) {
    const a=chain[j]*2,b=chain[j+1]*2,angle=Math.atan2(points[b+1]-points[a+1],points[b]-points[a]);
    const r=width*FINGER_SCALE[f]*(.5-j*.055),s=width*FINGER_SCALE[f]*(.5-(j+1)*.055),nx=Math.sin(angle),ny=-Math.cos(angle);
    path.moveTo(points[a]+nx*r,points[a+1]+ny*r);path.lineTo(points[b]+nx*s,points[b+1]+ny*s);
    path.arc(points[b],points[b+1],s,angle-Math.PI/2,angle+Math.PI/2);
    path.lineTo(points[a]-nx*r,points[a+1]-ny*r);path.arc(points[a],points[a+1],r,angle+Math.PI/2,angle+Math.PI*1.5);path.closePath();
  } });
  const rim=error?'#f3b18a':flash?'#d8f2a6':active?'#b8e989':'#95ce7c';
  const fill=error?'#bb715c':flash?'#54baa0':active?'#36aa90':'#369582';
  ctx.save();ctx.lineCap=ctx.lineJoin='round';
  // See-through glove: the vessel stays visible under the hands. One fill() of the same-winding path paints
  // each pixel once, so overlapping finger capsules do not darken. The rim is cut out offscreen so only the
  // outer silhouette is outlined, never the seams between capsules.
  ctx.globalAlpha=opacity*(active?.5:.38);ctx.fillStyle=fill;ctx.fill(path);
  drawOuterRim(ctx,path,points,edge,rim,opacity*(active?.95:.85));
  if(skeleton) {
    ctx.globalAlpha=opacity*.8;ctx.strokeStyle=ctx.fillStyle='#f7efd9';ctx.lineWidth=1;
    for(const chain of FINGERS){ctx.beginPath();chain.forEach((id,i)=>{if(i)ctx.lineTo(points[id*2],points[id*2+1]);else ctx.moveTo(points[id*2],points[id*2+1]);});ctx.stroke();}
    for(let i=0;i<21;i++){ctx.beginPath();ctx.arc(points[i*2],points[i*2+1],2,0,Math.PI*2);ctx.fill();}
  }
  ctx.restore();
}
