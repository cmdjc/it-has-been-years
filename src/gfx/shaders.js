export const SKY_GLSL = `
vec3 skyColor(vec3 d){
  float h = clamp(d.y, 0.0, 1.0);
  vec3 hor = vec3(0.80, 0.93, 0.98);
  vec3 zen = vec3(0.16, 0.48, 0.88);
  vec3 c = mix(hor, zen, pow(h, 0.5));
  vec3 sp = vec3(0.004, 0.009, 0.026) + hor * 0.45 * exp(-abs(d.y) * 40.0) * (1.0 - smoothstep(0.5, 0.95, space));
  c = mix(c, sp, space);
  float s = max(dot(d, sunDir), 0.0);
  c += vec3(1.0, 0.95, 0.8) * (pow(s, 1200.0) * 6.0 + pow(s, 28.0) * 0.28 * (1.0 - space));
  vec3 q = floor(d * 300.0);
  float r = fract(sin(dot(q, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  c += vec3(1.0) * step(0.9978, r) * space;
  return c;
}`;

export const SKY_VERT = "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }";

export const SKY_FRAG = "uniform vec3 sunDir; uniform float space; varying vec3 vD;" + SKY_GLSL + "void main(){ gl_FragColor = vec4(skyColor(normalize(vD)),1.0); }";

export const WATER_VERT = "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }";

export const WATER_FRAG = "uniform float time; uniform vec3 sunDir; uniform float space; varying vec3 vW;" + SKY_GLSL + `
void main(){
  vec3 V = normalize(cameraPosition - vW);
  float dist = length(cameraPosition - vW);
  float amp = 0.004 / (1.0 + dist * 0.003);
  vec2 p = vW.xz;
  float dx = cos(p.x*0.7 + time*0.8)*0.5 + cos((p.x+p.y)*1.3 - time*1.1)*0.35 + cos(p.y*2.1 + time*1.6)*0.25;
  float dz = cos(p.y*0.6 + time*0.7)*0.5 + cos((p.x-p.y)*1.1 + time*0.9)*0.35 + cos(p.x*2.3 - time*1.4)*0.25;
  vec3 N = normalize(vec3(-dx*amp*6.0, 1.0, -dz*amp*6.0));
  float cosT = max(dot(N, V), 0.0);
  float f = 0.03 + 0.3 * pow(1.0 - cosT, 4.0);
  vec3 R = reflect(-V, N); R.y = abs(R.y);
  vec3 refl = skyColor(R);
  vec3 body = vec3(0.1, 0.32, 0.4) + vec3(0.01, 0.035, 0.04) * (0.5 + 0.5 * dx);
  vec3 col = mix(body, refl, f);
  float sg = max(dot(R, sunDir), 0.0);
  col += vec3(1.0, 0.96, 0.85) * pow(sg, 160.0) * 0.06;
  gl_FragColor = vec4(col, 1.0);
}`;

export const PLANET_VERT = "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }";

export const PLANET_FRAG = `uniform vec3 sunDir; uniform vec3 uC; varying vec3 vW;
void main(){
  vec3 N = normalize(vW - uC), V = normalize(cameraPosition - vW);
  float cosT = max(dot(N, V), 0.0), day = clamp(dot(N, sunDir) * 1.4 + 0.25, 0.0, 1.0);
  vec3 col = vec3(0.10, 0.32, 0.40) * (0.08 + 0.92 * day);
  float rim = pow(1.0 - cosT, 3.0);
  col += vec3(0.35, 0.7, 1.0) * rim * (0.25 + 0.75 * day) * 0.8;
  col += vec3(1.0, 0.95, 0.85) * pow(max(dot(reflect(-V, N), sunDir), 0.0), 120.0) * day * 0.35;
  gl_FragColor = vec4(col, 1.0);
}`;

export const BEAM_VERT = "varying vec3 vN; varying vec3 vV; varying float vH; void main(){ vH = position.y + 0.5; vec4 w = modelMatrix * vec4(position,1.0); vN = normalize((modelMatrix * vec4(normal,0.0)).xyz); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }";

export const BEAM_FRAG = "varying vec3 vN; varying vec3 vV; varying float vH; void main(){ float e = pow(abs(dot(normalize(vN), normalize(vV))), 1.4); float f = pow(1.0 - clamp(vH, 0.0, 1.0), 1.6); gl_FragColor = vec4(vec3(0.82, 1.0, 1.0) * 1.4, e * f * 0.9); }";

export const EYE_VERT = "varying vec3 vN; varying vec3 vWp; void main(){ vN = normalize(position); vec4 w = modelMatrix * vec4(position,1.0); vWp = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }";

export const EYE_FRAG = `uniform vec3 look; uniform float dil; uniform float open; varying vec3 vN; varying vec3 vWp;
vec3 scales(vec3 n, float sheen){
  float th = acos(clamp(n.y, -1.0, 1.0)), ph = atan(n.z, n.x);
  vec2 g = vec2(ph * 26.0, th * 52.0); g.x += mod(floor(g.y), 2.0) * 0.5;
  vec2 f = fract(g) - 0.5;
  float d = max(abs(f.x) * 1.15, abs(f.y) * 0.95);
  float edge = smoothstep(0.34, 0.5, d), cell = fract(sin(dot(floor(g), vec2(12.9898, 78.233))) * 43758.5453);
  return vec3(0.010, 0.012, 0.015) * (0.8 + 0.5 * cell) + vec3(0.03, 0.036, 0.044) * edge * 0.6 + vec3(0.02, 0.03, 0.045) * sheen;
}
void main(){
  vec3 n = normalize(vN);
  float c = clamp(dot(n, look), -1.0, 1.0), ang = acos(c);
  vec3 upv = abs(look.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
  vec3 tx = normalize(cross(upv, look)), ty = cross(look, tx);
  float px = dot(n, tx), py = dot(n, ty), a = atan(py, px);
  float sheen = pow(1.0 - abs(dot(n, normalize(cameraPosition - vWp))), 3.0);
  vec3 sc = scales(n, sheen);
  vec3 sclera = mix(vec3(0.74, 0.30, 0.08), vec3(0.96, 0.56, 0.18), 0.5 + 0.5 * sin(a * 37.0 + ang * 9.0));
  float vein = smoothstep(0.9, 1.0, 0.5 + 0.5 * sin(a * 23.0 + ang * 31.0)) * smoothstep(0.4, 1.0, ang);
  sclera = mix(sclera, vec3(0.42, 0.08, 0.03), vein * 0.55);
  float iris = 1.0 - smoothstep(0.58, 0.62, ang);
  vec3 ic = mix(vec3(1.0, 0.76, 0.22), vec3(0.95, 0.36, 0.04), smoothstep(0.08, 0.6, ang));
  ic *= 0.82 + 0.28 * sin(a * 55.0 + ang * 4.0);
  float slitW = mix(0.04, 0.34, dil), slitH = 0.52;
  float pup = 1.0 - smoothstep(1.0, 1.12, length(vec2(px / slitW, py / slitH)));
  vec3 eye = mix(sclera, ic, iris);
  eye = mix(eye, vec3(0.015, 0.0, 0.0), pup);
  float ax = 1.1, ay = 0.03 + 0.95 * open;
  float ap = length(vec2(px / ax, py / ay));
  eye *= mix(1.0, 0.25, smoothstep(0.7, 1.0, ap));
  float lid = smoothstep(1.0, 0.94, ap) * step(0.0, c);
  vec3 col = mix(sc, eye, lid);
  gl_FragColor = vec4(col, 1.0);
}`;

export const FS_VERT = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";

export const BRIGHT_FRAG = "uniform sampler2D tex; varying vec2 vUv; void main(){ vec3 c = texture2D(tex, vUv).rgb; float l = dot(c, vec3(0.299,0.587,0.114)); gl_FragColor = vec4(c * smoothstep(0.93, 1.0, l), 1.0); }";

export const BLUR_FRAG = "uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv; void main(){ vec3 s = texture2D(tex, vUv).rgb * 0.227027; s += texture2D(tex, vUv + dir * 1.3846153).rgb * 0.3162162; s += texture2D(tex, vUv - dir * 1.3846153).rgb * 0.3162162; s += texture2D(tex, vUv + dir * 3.2307692).rgb * 0.0702703; s += texture2D(tex, vUv - dir * 3.2307692).rgb * 0.0702703; gl_FragColor = vec4(s, 1.0); }";

export const FINAL_FRAG = `uniform sampler2D tScene; uniform sampler2D tBloom; uniform vec2 res; uniform float time; uniform float bloomI; varying vec2 vUv;
void main(){
  vec2 c = vUv - 0.5; float r2 = dot(c, c);
  float ca = 0.0014 * r2 * 4.0;
  vec3 col = vec3(texture2D(tScene, vUv + c * ca).r, texture2D(tScene, vUv).g, texture2D(tScene, vUv - c * ca).b);
  col += texture2D(tBloom, vUv).rgb * bloomI;
  col = col / (1.0 + 0.2 * col) * 1.12;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = col * vec3(1.02, 1.0, 1.05) + vec3(0.006, 0.004, 0.02) * (1.0 - lum);
  col = mix(vec3(lum), col, 1.04);
  float vg = smoothstep(0.95, 0.25, sqrt(r2) * 1.15); col *= mix(0.84, 1.0, vg);
  float g = fract(sin(dot(vUv * res + fract(time), vec2(12.9898, 78.233))) * 43758.5453); col += (g - 0.5) * 0.022;
  gl_FragColor = vec4(col, 1.0);
}`;
