const oe=`
precision highp float;
varying vec2 vUv;
uniform float uTime,uIntensity,uSeed,uAspect,uInner,uBand,uScroll,uSparkle;
uniform vec2 uCardSize;
uniform float uRadius;
uniform vec3 uCol0,uCol1,uCol2,uSmoke;

float hash(vec2 p){p=fract(p*vec2(127.1,311.7)+uSeed*17.13);p+=dot(p,p+34.23);return fract(p.x*p.y);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
float fbm(vec2 p){
  float v=0.,a=.5;
  for(int i=0;i<5;i++){v+=a*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}
  return v;
}
float sdRound(vec2 p, vec2 b, float r){
  vec2 d=abs(p)-b+r;
  return length(max(d,0.))+min(max(d.x,d.y),0.)-r;
}
void main(){
  vec2 g=vUv*2.-1.;
  vec2 px=g*uCardSize*0.95;
  float sdPx=sdRound(px,uCardSize*0.5,uRadius);
  float sd=sdPx/(min(uCardSize.x,uCardSize.y)*0.95);
  float outside=max(0.,sd);    // sd>0：卡片外
  float inside=max(0.,-sd);    // sd<0：卡片内
  float T=uTime*uScroll;

  // 火舌向上剪切：边缘外的像素采样点上移（顶边升得最高，侧边向上弯）
  float lift=outside*(0.45+1.0*smoothstep(-0.35,0.95,g.y));
  vec2 sp=vec2(g.x*uAspect, g.y-lift)*vec2(2.6,2.2)+vec2(0.,-T*1.5)+uSeed*13.7;
  vec2 q=vec2(fbm(sp+vec2(0.,-T*0.45)),fbm(sp+vec2(5.2,-T*0.3)));
  vec2 r2=vec2(fbm(sp+3.2*q+vec2(1.7,-T*0.7)),fbm(sp+3.2*q+vec2(8.3,-T*0.55)));
  float f=fbm(sp+3.2*r2);
  float f2=fbm(sp*3.3+vec2(0.,-T*2.2)+11.7);
  f=f*0.7+f2*0.3;

  // 贴边火焰：向外延伸（火舌）与向内舔焰分别用 SDF 符号掩码，互不越界
  float bandOut=exp(-outside*uBand)*smoothstep(-0.02,0.02,sd);
  float bandIn=uInner*exp(-inside*13.0)*(1.0-smoothstep(-0.02,0.02,sd));
  float body=(bandOut+bandIn)*(0.22+1.25*f);
  float wisp=exp(-outside*4.2)*smoothstep(0.55,0.95,f)*1.5;
  float flame=clamp(body*1.35+wisp,0.,1.);
  flame*=0.85+0.15*sin(T*2.6+uSeed*3.1);

  float aFire=smoothstep(0.22,0.8,flame)*uIntensity;
  vec3 col=mix(uCol2,uCol1,smoothstep(0.15,0.6,flame));
  col=mix(col,uCol0,smoothstep(0.55,0.95,flame));
  // 卡片边缘高温核心线（细）
  float core=exp(-abs(sd)*55.0);
  col+=uCol0*core*0.55;
  aFire=max(aFire,core*0.35*uIntensity);
  // 冰晶闪点（细小、锐利）
  if(uSparkle>0.){
    float glint=pow(noise(vec2(g.x*uAspect,g.y)*55.0+T*4.0),16.0);
    col+=vec3(0.9,0.97,1.0)*glint*1.2*aFire;
  }
  // 灰烟卷须（火舌尾部）
  float smokeA=exp(-outside*2.1)*smoothstep(0.62,0.96,q.y)*0.26*(1.0-min(aFire*1.8,1.0))*uIntensity;
  vec3 outCol=col*aFire+uSmoke*smokeA;
  float outA=clamp(aFire+smokeA*0.8,0.,1.);
  // Keep the actual user text unobscured; only the perimeter receives front-layer licks.
  float safeEdge=1.0-smoothstep(9.0,min(25.0,uCardSize.x*0.22),max(0.0,-sdPx));
  gl_FragColor=vec4(outCol,outA*safeEdge);
}`,ie=`attribute vec2 aPosition;uniform vec2 uViewport;uniform vec4 uRect;uniform float uDepth;varying vec2 vUv;
void main(){vUv=vec2(aPosition.x,1.-aPosition.y);vec2 p=uRect.xy+aPosition*uRect.zw;gl_Position=vec4(p.x/uViewport.x*2.-1.,1.-p.y/uViewport.y*2.,uDepth,1.);}`,ae=`precision mediump float;varying vec2 vUv;uniform vec2 uCardSize;uniform float uRadius;
void main(){vec2 p=abs((vUv-.5)*uCardSize)-uCardSize*.5+uRadius;if(length(max(p,0.))+min(max(p.x,p.y),0.)>uRadius)discard;gl_FragColor=vec4(0.);}`,ne=`precision mediump float;varying vec2 vUv;uniform vec3 uColor;uniform float uAlpha;
void main(){float a=(1.-smoothstep(.05,1.,length(vUv-.5)*2.))*uAlpha;gl_FragColor=vec4(uColor,a);}`,O={1:{core:[1,.93,.62],middle:[1,.55,.1],edge:[.62,.13,.02],smoke:[.16,.14,.15],band:8.5,scroll:1,sparkle:0,inner:.85},2:{core:[.97,.99,1],middle:[.55,.85,1],edge:[.1,.32,.72],smoke:[.62,.74,.92],band:7.5,scroll:.55,sparkle:1.2,inner:.9},3:{core:[1,.72,.3],middle:[.92,.34,.08],edge:[.45,.06,.03],smoke:[.13,.1,.11],band:10.5,scroll:1.3,sparkle:0,inner:.65}};function se(h,v,Z,k){const H=h.getContext("webgl",{alpha:!0,antialias:!1,depth:!0,premultipliedAlpha:!0,powerPreference:"low-power"});if(!H)throw new Error("WebGL unavailable");const e=H;let u={...Z},B=!1,y=!1,R=!0,d=0,g=0,F=8,U=0,z=0,x=0,L=0,T=1,A=window.innerWidth<600?1:1.5,S=!0,m=[],p=null;const w=window.matchMedia("(prefers-reduced-motion: reduce)"),P=(t,o)=>(t.locations.has(o)||t.locations.set(o,e.getUniformLocation(t.program,o)),t.locations.get(o)),c=(t,o,a)=>e.uniform1f(P(t,o),a),G=(t,o,a,l)=>e.uniform2f(P(t,o),a,l),E=(t,o,a)=>e.uniform3fv(P(t,o),a);function N(t){const o=[],a=e.createProgram();if(!a)throw new Error("Cannot allocate flame program");try{for(const[l,r]of[[e.VERTEX_SHADER,ie],[e.FRAGMENT_SHADER,t]]){const i=e.createShader(l);if(!i)throw new Error("Cannot allocate shader");if(o.push(i),e.shaderSource(i,r),e.compileShader(i),!e.getShaderParameter(i,e.COMPILE_STATUS))throw new Error(e.getShaderInfoLog(i)||"Flame compilation failed");e.attachShader(a,i)}if(e.linkProgram(a),!e.getProgramParameter(a,e.LINK_STATUS))throw new Error(e.getProgramInfoLog(a)||"Flame link failed");return{program:a,position:e.getAttribLocation(a,"aPosition"),locations:new Map}}catch(l){throw e.deleteProgram(a),l}finally{o.forEach(l=>e.deleteShader(l))}}function M(){m.forEach(t=>e.deleteProgram(t.program)),m=[],p&&e.deleteBuffer(p),p=null}function V(){M();try{if(m.push(N(ae)),m.push(N(oe)),m.push(N(ne)),p=e.createBuffer(),!p)throw new Error("Cannot allocate flame geometry");e.bindBuffer(e.ARRAY_BUFFER,p),e.bufferData(e.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]),e.STATIC_DRAW)}catch(t){throw M(),t}e.enable(e.DEPTH_TEST),e.depthFunc(e.LEQUAL),e.clearColor(0,0,0,0),S=!0}function I(t,o,a,l){e.useProgram(t.program),e.bindBuffer(e.ARRAY_BUFFER,p),e.enableVertexAttribArray(t.position),e.vertexAttribPointer(t.position,2,e.FLOAT,!1,0,0),G(t,"uViewport",x,L),G(t,"uCardSize",o.width,o.height),c(t,"uRadius",o.radius),c(t,"uDepth",l),e.uniform4f(P(t,"uRect"),o.x-o.width*(a-1)/2,o.y-o.height*(a-1)/2,o.width*a,o.height*a)}function $(){const t=v.getBoundingClientRect();if(!t.width||!t.height)return;const o=Math.min(window.devicePixelRatio||1,u.quality==="low"?.8:u.quality==="high"?2:A);(x!==t.width||L!==t.height||T!==o)&&(x=t.width,L=t.height,T=o,h.width=Math.round(x*T),h.height=Math.round(L*T),e.viewport(0,0,h.width,h.height));const a=Array.from(v.querySelectorAll(".recharge-winner")).map(r=>{const i=r.getBoundingClientRect();return{x:i.left-t.left,y:i.top-t.top,width:i.width,height:i.height,radius:parseFloat(getComputedStyle(r).borderTopLeftRadius)||20,rank:Number(r.dataset.rank)}}).filter(r=>r.width>0&&O[r.rank]);e.depthMask(!0),e.colorMask(!0,!0,!0,!0),e.clear(e.COLOR_BUFFER_BIT|e.DEPTH_BUFFER_BIT),e.disable(e.BLEND),e.colorMask(!1,!1,!1,!1);for(const r of a)I(m[0],r,1,0),e.drawArrays(e.TRIANGLES,0,6);e.colorMask(!0,!0,!0,!0),e.depthMask(!1),e.enable(e.BLEND),e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA),e.colorMask(!1,!1,!1,!1),e.depthMask(!0);for(const r of a){const i=Math.min(25,r.width*.22);I(m[0],{...r,x:r.x+i,y:r.y+i,width:r.width-i*2,height:r.height-i*2,radius:Math.max(0,r.radius-i)},1,-.5),e.drawArrays(e.TRIANGLES,0,6)}e.colorMask(!0,!0,!0,!0),e.depthMask(!1);const l=a.filter(r=>t.top+r.y+r.height*1.45>0&&t.top+r.y-r.height*.45<window.innerHeight);for(const r of[!1,!0])for(const i of l){const n=m[1],f=O[i.rank];I(n,i,1.9,r?-.2:.2),c(n,"uTime",F+(r?0:7.7)),c(n,"uIntensity",u.intensity),c(n,"uSeed",i.rank*23.718+(r?7.33:0)),c(n,"uAspect",i.width/i.height),c(n,"uInner",r?f.inner:.22),c(n,"uBand",f.band),c(n,"uScroll",f.scroll),c(n,"uSparkle",f.sparkle),E(n,"uCol0",f.core),E(n,"uCol1",f.middle),E(n,"uCol2",f.edge),E(n,"uSmoke",f.smoke),e.drawArrays(e.TRIANGLES,0,6)}if(u.particles&&A>.6)for(const r of l){const i=m[2],n=O[r.rank],f=x<600?12:28;for(let b=0;b<f;b++){const C=(b*.61803398875+r.rank*.13)%1,j=(F*(.23+C*.11)+C)%1,_=b%4,te=_===2?0:_===3?r.width:C*r.width,re=_===0?0:_===1?r.height:C*r.height,J=(r.rank===2?2:3)+C*2;I(i,{...r,x:r.x+te+Math.sin(F+b)*7,y:r.y+re-j*65,width:J,height:J},1,b%3===0?.1:-.3),E(i,"uColor",n.core),c(i,"uAlpha",Math.sin(j*Math.PI)*.7*u.intensity),e.drawArrays(e.TRIANGLES,0,6)}}k(w.matches?"static":"ready"),S=!1}function D(){!d&&!B&&!y&&R&&!document.hidden&&(d=requestAnimationFrame(ee))}function ee(t){if(d=0,B||y||!R||document.hidden)return;const o=g?Math.min((t-g)/1e3,.08):0;if(g=t,!w.matches&&u.speed>0&&(F+=o*u.speed),S||!w.matches&&u.speed>0)try{$()}catch{y=!0,k("fallback");return}!w.matches&&u.speed>0&&(u.quality==="auto"&&o>0&&(U++,o>.032&&z++,U>=100&&(z>55&&A>.6&&(A=Math.max(.6,A-.25),S=!0),U=z=0)),D())}function s(){S=!0,g=0,D()}function W(){document.hidden?(cancelAnimationFrame(d),d=0,g=0):s()}function Y(t){t.preventDefault(),y=!0,cancelAnimationFrame(d),d=0,k("fallback")}function K(){try{V(),y=!1,s()}catch{k("fallback")}}try{V()}catch(t){throw M(),t}const q=new ResizeObserver(s);q.observe(v),v.querySelectorAll(".recharge-winner").forEach(t=>q.observe(t));const Q=new IntersectionObserver(t=>{R=t.some(o=>o.isIntersecting),R?s():(cancelAnimationFrame(d),d=0,g=0)},{rootMargin:"80px"});Q.observe(v);const X=new MutationObserver(s);return X.observe(v,{childList:!0,subtree:!0}),window.addEventListener("resize",s),window.addEventListener("scroll",s,{capture:!0,passive:!0}),document.addEventListener("visibilitychange",W),w.addEventListener("change",s),h.addEventListener("webglcontextlost",Y),h.addEventListener("webglcontextrestored",K),D(),{update(t){u={...t},s()},dispose(){var t;B=!0,cancelAnimationFrame(d),q.disconnect(),Q.disconnect(),X.disconnect(),window.removeEventListener("resize",s),window.removeEventListener("scroll",s,!0),document.removeEventListener("visibilitychange",W),w.removeEventListener("change",s),h.removeEventListener("webglcontextlost",Y),h.removeEventListener("webglcontextrestored",K),M(),(t=e.getExtension("WEBGL_lose_context"))==null||t.loseContext()}}}export{se as createRechargeFlames};
