const FINGERS = [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]];

/** A single filled silhouette from the existing landmarks; never used as input geometry. */
export function drawHandGlove(ctx: CanvasRenderingContext2D, points: Float32Array, opacity: number, active = false, flash = false, error = false, skeleton = false): void {
  const acrossX=points[10]-points[34], acrossY=points[11]-points[35];
  const span=Math.hypot(acrossX,acrossY), palmLength=Math.hypot(points[0]-points[18],points[1]-points[19]);
  if (!Number.isFinite(span+palmLength) || palmLength<1 || opacity<=0) return;
  const width=Math.max(8,Math.min(42,Math.max(span,palmLength*.9)*.24));
  const edge=Math.max(2,Math.min(4.5,width*.15));
  const path=new Path2D(), dx=acrossX/(span||1),dy=acrossY/(span||1);
  const palm=[{x:points[0]+dx*span*.26,y:points[1]+dy*span*.26},
    ...[1,2,5,9,13,17].map(i=>({x:points[i*2],y:points[i*2+1]})),
    {x:points[0]-dx*span*.26,y:points[1]-dy*span*.26}];
  // Match capsule winding on both mirrored hands so overlapping fills cannot cut holes.
  const area=palm.reduce((sum,p,i)=>{const q=palm[(i+1)%palm.length];return sum+p.x*q.y-q.x*p.y;},0);
  if(area<0) palm.reverse();
  const last=palm.at(-1)!;path.moveTo((last.x+palm[0].x)/2,(last.y+palm[0].y)/2);
  for(let i=0;i<palm.length;i++){const p=palm[i],q=palm[(i+1)%palm.length];path.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2);}
  path.closePath();
  for(const chain of FINGERS) for(let j=0;j<3;j++) {
    const a=chain[j]*2,b=chain[j+1]*2,angle=Math.atan2(points[b+1]-points[a+1],points[b]-points[a]);
    const r=width*(.54-j*.05),s=width*(.49-j*.05),nx=Math.sin(angle),ny=-Math.cos(angle);
    path.moveTo(points[a]+nx*r,points[a+1]+ny*r);path.lineTo(points[b]+nx*s,points[b+1]+ny*s);
    path.arc(points[b],points[b+1],s,angle-Math.PI/2,angle+Math.PI/2);
    path.lineTo(points[a]-nx*r,points[a+1]-ny*r);path.arc(points[a],points[a+1],r,angle+Math.PI/2,angle+Math.PI*1.5);path.closePath();
  }
  const rim=error?'#f3b18a':flash?'#d8f2a6':active?'#b8e989':'#95ce7c';
  ctx.save();ctx.lineCap=ctx.lineJoin='round';
  // Opaque internal fill joins the capsules into one glove. Tracking loss still fades the whole hand.
  ctx.globalAlpha=opacity;ctx.fillStyle=error?'#bb715c':flash?'#54baa0':active?'#36aa90':'#369582';
  ctx.strokeStyle=rim;ctx.lineWidth=edge*2;ctx.shadowColor=rim;ctx.shadowBlur=active?5:2;
  ctx.stroke(path);ctx.shadowBlur=0;ctx.fill(path);
  // Small curved palm creases give the reference's glove feel without visible joints.
  const ux=(points[18]-points[0])/palmLength,uy=(points[19]-points[1])/palmLength;
  const cx=points[0]+ux*palmLength*.43,cy=points[1]+uy*palmLength*.43;
  ctx.globalAlpha=opacity*.3;ctx.strokeStyle='#d3efbc';ctx.lineWidth=Math.max(1.5,width*.10);
  ctx.beginPath();ctx.moveTo(cx+dx*span*.18,cy+dy*span*.18);
  ctx.quadraticCurveTo(cx-ux*width*.45,cy-uy*width*.45,cx-dx*span*.17,cy-dy*span*.17);ctx.stroke();
  if(skeleton) {
    ctx.globalAlpha=opacity*.8;ctx.strokeStyle=ctx.fillStyle='#f7efd9';ctx.lineWidth=1;
    for(const chain of FINGERS){ctx.beginPath();chain.forEach((id,i)=>{if(i)ctx.lineTo(points[id*2],points[id*2+1]);else ctx.moveTo(points[id*2],points[id*2+1]);});ctx.stroke();}
    for(let i=0;i<21;i++){ctx.beginPath();ctx.arc(points[i*2],points[i*2+1],2,0,Math.PI*2);ctx.fill();}
  }
  ctx.restore();
}
