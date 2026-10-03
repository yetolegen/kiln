/** Canvas-only presentation of the existing 21 landmarks. No input or recognition state is modified. */
export function drawHandGlove(ctx: CanvasRenderingContext2D, points: Float32Array, opacity: number, active = false, flash = false, error = false, skeleton = false): void {
  const fingers = [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]];
  const palm = [0,1,2,5,9,13,17];
  const width = Math.max(8, Math.min(24, Math.hypot(points[0]-points[18],points[1]-points[19])*.2));
  const color = error ? '#efa18a' : flash ? '#e7f2d0' : '#f0cba1';
  const path = (indices: number[]) => { ctx.beginPath(); indices.forEach((id,i)=>{ const x=points[id*2],y=points[id*2+1]; if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y); }); };
  ctx.save();ctx.lineCap=ctx.lineJoin='round';ctx.strokeStyle=ctx.fillStyle=color;
  ctx.globalAlpha=opacity*(active ? .3 : .18);ctx.shadowColor=color;ctx.shadowBlur=active ? 7 : 3;
  path(palm);ctx.closePath();ctx.fill();
  ctx.lineWidth=width;
  for(const chain of fingers) {path(chain);ctx.stroke();}
  ctx.shadowBlur=0;ctx.globalAlpha=opacity*.4;ctx.lineWidth=1.2;
  path(palm);ctx.closePath();ctx.stroke();
  for(const chain of fingers) {
    if(skeleton) {path(chain);ctx.stroke();}
    for(const id of chain.slice(1)) {ctx.beginPath();ctx.arc(points[id*2],points[id*2+1],1.8,0,Math.PI*2);ctx.fill();}
  }
  ctx.restore();
}
