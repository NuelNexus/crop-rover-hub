import { useEffect, useRef, useState } from "react";
import "@/styles/sakura.css";

type SakuraOverlayProps = {
  active?: boolean;
  autoStopMs?: number;
  className?: string;
  showToggleButton?: boolean;
  onStop?: () => void;
};

const SakuraOverlay = ({
  active = true,
  autoStopMs,
  className,
  showToggleButton = true,
  onStop,
}: SakuraOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const setAnimatingRef = useRef<(value: boolean) => void>(() => undefined);
  const [isAnimating, setIsAnimating] = useState(active);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animating = true;
    let rafId = 0;
    let gl: WebGLRenderingContext | null = null;

    // Utilities
    const Vector3: any = {};
    const Matrix44: any = {};
    Vector3.create = (x: number, y: number, z: number) => ({ x, y, z });
    Vector3.dot = (v0: any, v1: any) => v0.x * v1.x + v0.y * v1.y + v0.z * v1.z;
    Vector3.cross = (v: any, v0: any, v1: any) => {
      v.x = v0.y * v1.z - v0.z * v1.y;
      v.y = v0.z * v1.x - v0.x * v1.z;
      v.z = v0.x * v1.y - v0.y * v1.x;
    };
    Vector3.normalize = (v: any) => {
      let l = v.x * v.x + v.y * v.y + v.z * v.z;
      if (l > 0.00001) {
        l = 1.0 / Math.sqrt(l);
        v.x *= l;
        v.y *= l;
        v.z *= l;
      }
    };
    Vector3.arrayForm = (v: any) => {
      if (v.array) {
        v.array[0] = v.x;
        v.array[1] = v.y;
        v.array[2] = v.z;
      } else {
        v.array = new Float32Array([v.x, v.y, v.z]);
      }
      return v.array;
    };

    Matrix44.createIdentity = () =>
      new Float32Array([1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0]);

    Matrix44.loadProjection = (m: Float32Array, aspect: number, vdeg: number, near: number, far: number) => {
      const h = near * Math.tan((vdeg * Math.PI) / 180.0 * 0.5) * 2.0;
      const w = h * aspect;
      m[0] = (2.0 * near) / w;
      m[1] = 0.0;
      m[2] = 0.0;
      m[3] = 0.0;
      m[4] = 0.0;
      m[5] = (2.0 * near) / h;
      m[6] = 0.0;
      m[7] = 0.0;
      m[8] = 0.0;
      m[9] = 0.0;
      m[10] = -(far + near) / (far - near);
      m[11] = -1.0;
      m[12] = 0.0;
      m[13] = 0.0;
      m[14] = (-2.0 * far * near) / (far - near);
      m[15] = 0.0;
    };

    Matrix44.loadLookAt = (m: Float32Array, vpos: any, vlook: any, vup: any) => {
      const frontv = Vector3.create(vpos.x - vlook.x, vpos.y - vlook.y, vpos.z - vlook.z);
      Vector3.normalize(frontv);
      const sidev = Vector3.create(1.0, 0.0, 0.0);
      Vector3.cross(sidev, vup, frontv);
      Vector3.normalize(sidev);
      const topv = Vector3.create(1.0, 0.0, 0.0);
      Vector3.cross(topv, frontv, sidev);
      Vector3.normalize(topv);

      m[0] = sidev.x;
      m[1] = topv.x;
      m[2] = frontv.x;
      m[3] = 0.0;
      m[4] = sidev.y;
      m[5] = topv.y;
      m[6] = frontv.y;
      m[7] = 0.0;
      m[8] = sidev.z;
      m[9] = topv.z;
      m[10] = frontv.z;
      m[11] = 0.0;
      m[12] = -(vpos.x * m[0] + vpos.y * m[4] + vpos.z * m[8]);
      m[13] = -(vpos.x * m[1] + vpos.y * m[5] + vpos.z * m[9]);
      m[14] = -(vpos.x * m[2] + vpos.y * m[6] + vpos.z * m[10]);
      m[15] = 1.0;
    };

    const timeInfo = { start: 0, prev: 0, delta: 0, elapsed: 0 };

    const renderSpec: any = {
      width: 0,
      height: 0,
      aspect: 1,
      array: new Float32Array(3),
      halfWidth: 0,
      halfHeight: 0,
      halfArray: new Float32Array(3),
      setSize(w: number, h: number) {
        renderSpec.width = w;
        renderSpec.height = h;
        renderSpec.aspect = renderSpec.width / renderSpec.height;
        renderSpec.array[0] = renderSpec.width;
        renderSpec.array[1] = renderSpec.height;
        renderSpec.array[2] = renderSpec.aspect;
        renderSpec.halfWidth = Math.floor(w / 2);
        renderSpec.halfHeight = Math.floor(h / 2);
        renderSpec.halfArray[0] = renderSpec.halfWidth;
        renderSpec.halfArray[1] = renderSpec.halfHeight;
        renderSpec.halfArray[2] = renderSpec.halfWidth / renderSpec.halfHeight;
      },
    };

    const deleteRenderTarget = (rt: any) => {
      gl?.deleteFramebuffer(rt.frameBuffer);
      gl?.deleteRenderbuffer(rt.renderBuffer);
      gl?.deleteTexture(rt.texture);
    };

    const createRenderTarget = (w: number, h: number) => {
      const ret: any = {
        width: w,
        height: h,
        sizeArray: new Float32Array([w, h, w / h]),
        dtxArray: new Float32Array([1.0 / w, 1.0 / h]),
      };
      if (!gl) return ret;
      ret.frameBuffer = gl.createFramebuffer();
      ret.renderBuffer = gl.createRenderbuffer();
      ret.texture = gl.createTexture();

      gl.bindTexture(gl.TEXTURE_2D, ret.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

      gl.bindFramebuffer(gl.FRAMEBUFFER, ret.frameBuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ret.texture, 0);

      gl.bindRenderbuffer(gl.RENDERBUFFER, ret.renderBuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, ret.renderBuffer);

      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindRenderbuffer(gl.RENDERBUFFER, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      return ret;
    };

    const compileShader = (shtype: number, shsrc: string) => {
      if (!gl) return null;
      const retsh = gl.createShader(shtype);
      if (!retsh) return null;
      gl.shaderSource(retsh, shsrc);
      gl.compileShader(retsh);
      if (!gl.getShaderParameter(retsh, gl.COMPILE_STATUS)) {
        const errlog = gl.getShaderInfoLog(retsh);
        gl.deleteShader(retsh);
        console.error(errlog);
        return null;
      }
      return retsh;
    };

    const createShader = (vtxsrc: string, frgsrc: string, uniformlist?: string[], attrlist?: string[]) => {
      if (!gl) return null;
      const vsh = compileShader(gl.VERTEX_SHADER, vtxsrc);
      const fsh = compileShader(gl.FRAGMENT_SHADER, frgsrc);
      if (vsh == null || fsh == null) return null;

      const prog: any = gl.createProgram();
      gl.attachShader(prog, vsh);
      gl.attachShader(prog, fsh);
      gl.deleteShader(vsh);
      gl.deleteShader(fsh);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        const errlog = gl.getProgramInfoLog(prog);
        console.error(errlog);
        return null;
      }
      if (uniformlist) {
        prog.uniforms = {};
        for (let i = 0; i < uniformlist.length; i++) {
          prog.uniforms[uniformlist[i]] = gl.getUniformLocation(prog, uniformlist[i]);
        }
      }
      if (attrlist) {
        prog.attributes = {};
        for (let i = 0; i < attrlist.length; i++) {
          const attr = attrlist[i];
          prog.attributes[attr] = gl.getAttribLocation(prog, attr);
        }
      }
      return prog;
    };

    const useShader = (prog: any) => {
      if (!gl) return;
      gl.useProgram(prog);
      for (const attr in prog.attributes) gl.enableVertexAttribArray(prog.attributes[attr]);
    };

    const unuseShader = (prog: any) => {
      if (!gl) return;
      for (const attr in prog.attributes) gl.disableVertexAttribArray(prog.attributes[attr]);
      gl.useProgram(null);
    };

    const projection = {
      angle: 60,
      nearfar: new Float32Array([0.1, 100.0]),
      matrix: Matrix44.createIdentity(),
    };

    const camera = {
      position: Vector3.create(0, 0, 100),
      lookat: Vector3.create(0, 0, 0),
      up: Vector3.create(0, 1, 0),
      dof: Vector3.create(10.0, 4.0, 8.0),
      matrix: Matrix44.createIdentity(),
    };

    const pointFlower: any = {};
    const effectLib: any = {};
    let sceneStandBy = false;

    const BlossomParticle: any = function () {
      this.velocity = new Array(3);
      this.rotation = new Array(3);
      this.position = new Array(3);
      this.euler = new Array(3);
      this.size = 1.0;
      this.alpha = 1.0;
      this.zkey = 0.0;
    };

    BlossomParticle.prototype.setVelocity = function (vx: number, vy: number, vz: number) {
      this.velocity[0] = vx;
      this.velocity[1] = vy;
      this.velocity[2] = vz;
    };
    BlossomParticle.prototype.setRotation = function (rx: number, ry: number, rz: number) {
      this.rotation[0] = rx;
      this.rotation[1] = ry;
      this.rotation[2] = rz;
    };
    BlossomParticle.prototype.setPosition = function (nx: number, ny: number, nz: number) {
      this.position[0] = nx;
      this.position[1] = ny;
      this.position[2] = nz;
    };
    BlossomParticle.prototype.setEulerAngles = function (rx: number, ry: number, rz: number) {
      this.euler[0] = rx;
      this.euler[1] = ry;
      this.euler[2] = rz;
    };
    BlossomParticle.prototype.setSize = function (s: number) {
      this.size = s;
    };
    BlossomParticle.prototype.update = function (dt: number) {
      this.position[0] += this.velocity[0] * dt;
      this.position[1] += this.velocity[1] * dt;
      this.position[2] += this.velocity[2] * dt;
      this.euler[0] += this.rotation[0] * dt;
      this.euler[1] += this.rotation[1] * dt;
      this.euler[2] += this.rotation[2] * dt;
    };

    const createPointFlowers = () => {
      if (!gl) return;
      const prm = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
      renderSpec.pointSize = { min: prm[0], max: prm[1] };

      const vtxsrc = document.getElementById("sakura_point_vsh")?.textContent || "";
      const frgsrc = document.getElementById("sakura_point_fsh")?.textContent || "";

      pointFlower.program = createShader(
        vtxsrc,
        frgsrc,
        ["uProjection", "uModelview", "uResolution", "uOffset", "uDOF", "uFade"],
        ["aPosition", "aEuler", "aMisc"],
      );

      useShader(pointFlower.program);
      pointFlower.offset = new Float32Array([0.0, 0.0, 0.0]);
      pointFlower.fader = Vector3.create(0.0, 10.0, 0.0);

      pointFlower.numFlowers = 1600;
      pointFlower.particles = new Array(pointFlower.numFlowers);
      pointFlower.dataArray = new Float32Array(pointFlower.numFlowers * (3 + 3 + 2));
      pointFlower.positionArrayOffset = 0;
      pointFlower.eulerArrayOffset = pointFlower.numFlowers * 3;
      pointFlower.miscArrayOffset = pointFlower.numFlowers * 6;

      pointFlower.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, pointFlower.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, pointFlower.dataArray, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      unuseShader(pointFlower.program);

      for (let i = 0; i < pointFlower.numFlowers; i++) pointFlower.particles[i] = new BlossomParticle();
    };

    const initPointFlowers = () => {
      pointFlower.area = Vector3.create(20.0, 20.0, 20.0);
      pointFlower.area.x = pointFlower.area.y * renderSpec.aspect;
      pointFlower.fader.x = 10.0;
      pointFlower.fader.y = pointFlower.area.z;
      pointFlower.fader.z = 0.1;

      const PI2 = Math.PI * 2.0;
      const tmpv3 = Vector3.create(0, 0, 0);
      const symmetryrand = () => Math.random() * 2.0 - 1.0;

      for (let i = 0; i < pointFlower.numFlowers; i++) {
        const tmpprtcl = pointFlower.particles[i];

        tmpv3.x = symmetryrand() * 0.3 + 0.8;
        tmpv3.y = symmetryrand() * 0.2 - 1.0;
        tmpv3.z = symmetryrand() * 0.3 + 0.5;
        Vector3.normalize(tmpv3);
        let tmpv = 2.0 + Math.random() * 1.0;
        tmpprtcl.setVelocity(tmpv3.x * tmpv, tmpv3.y * tmpv, tmpv3.z * tmpv);

        tmpprtcl.setRotation(symmetryrand() * PI2 * 0.5, symmetryrand() * PI2 * 0.5, symmetryrand() * PI2 * 0.5);

        tmpprtcl.setPosition(symmetryrand() * pointFlower.area.x, symmetryrand() * pointFlower.area.y, symmetryrand() * pointFlower.area.z);

        tmpprtcl.setEulerAngles(Math.random() * Math.PI * 2.0, Math.random() * Math.PI * 2.0, Math.random() * Math.PI * 2.0);

        tmpprtcl.setSize(0.9 + Math.random() * 0.1);
      }
    };

    const renderPointFlowers = () => {
      if (!gl) return;
      const PI2 = Math.PI * 2.0;
      const repeatPos = (prt: any, cmp: number, limit: number) => {
        if (Math.abs(prt.position[cmp]) - prt.size * 0.5 > limit) {
          prt.position[cmp] += prt.position[cmp] > 0 ? -limit * 2.0 : limit * 2.0;
        }
      };
      const repeatEuler = (prt: any, cmp: number) => {
        prt.euler[cmp] = prt.euler[cmp] % PI2;
        if (prt.euler[cmp] < 0.0) prt.euler[cmp] += PI2;
      };

      for (let i = 0; i < pointFlower.numFlowers; i++) {
        const prtcl = pointFlower.particles[i];
        prtcl.update(timeInfo.delta, timeInfo.elapsed);
        repeatPos(prtcl, 0, pointFlower.area.x);
        repeatPos(prtcl, 1, pointFlower.area.y);
        repeatPos(prtcl, 2, pointFlower.area.z);
        repeatEuler(prtcl, 0);
        repeatEuler(prtcl, 1);
        repeatEuler(prtcl, 2);
        prtcl.alpha = 1.0;
        prtcl.zkey = camera.matrix[2] * prtcl.position[0] + camera.matrix[6] * prtcl.position[1] + camera.matrix[10] * prtcl.position[2] + camera.matrix[14];
      }

      pointFlower.particles.sort((p0: any, p1: any) => p0.zkey - p1.zkey);

      let ipos = pointFlower.positionArrayOffset;
      let ieuler = pointFlower.eulerArrayOffset;
      let imisc = pointFlower.miscArrayOffset;
      for (let i = 0; i < pointFlower.numFlowers; i++) {
        const prtcl = pointFlower.particles[i];
        pointFlower.dataArray[ipos] = prtcl.position[0];
        pointFlower.dataArray[ipos + 1] = prtcl.position[1];
        pointFlower.dataArray[ipos + 2] = prtcl.position[2];
        ipos += 3;
        pointFlower.dataArray[ieuler] = prtcl.euler[0];
        pointFlower.dataArray[ieuler + 1] = prtcl.euler[1];
        pointFlower.dataArray[ieuler + 2] = prtcl.euler[2];
        ieuler += 3;
        pointFlower.dataArray[imisc] = prtcl.size;
        pointFlower.dataArray[imisc + 1] = prtcl.alpha;
        imisc += 2;
      }

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      const prog = pointFlower.program;
      useShader(prog);

      gl.uniformMatrix4fv(prog.uniforms.uProjection, false, projection.matrix);
      gl.uniformMatrix4fv(prog.uniforms.uModelview, false, camera.matrix);
      gl.uniform3fv(prog.uniforms.uResolution, renderSpec.array);
      gl.uniform3fv(prog.uniforms.uDOF, Vector3.arrayForm(camera.dof));
      gl.uniform3fv(prog.uniforms.uFade, Vector3.arrayForm(pointFlower.fader));

      gl.bindBuffer(gl.ARRAY_BUFFER, pointFlower.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, pointFlower.dataArray, gl.DYNAMIC_DRAW);

      gl.vertexAttribPointer(prog.attributes.aPosition, 3, gl.FLOAT, false, 0, pointFlower.positionArrayOffset * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(prog.attributes.aEuler, 3, gl.FLOAT, false, 0, pointFlower.eulerArrayOffset * Float32Array.BYTES_PER_ELEMENT);
      gl.vertexAttribPointer(prog.attributes.aMisc, 2, gl.FLOAT, false, 0, pointFlower.miscArrayOffset * Float32Array.BYTES_PER_ELEMENT);

      for (let i = 1; i < 2; i++) {
        const zpos = i * -2.0;
        pointFlower.offset[0] = pointFlower.area.x * -1.0;
        pointFlower.offset[1] = pointFlower.area.y * -1.0;
        pointFlower.offset[2] = pointFlower.area.z * zpos;
        gl.uniform3fv(prog.uniforms.uOffset, pointFlower.offset);
        gl.drawArrays(gl.POINTS, 0, pointFlower.numFlowers);

        pointFlower.offset[0] = pointFlower.area.x * -1.0;
        pointFlower.offset[1] = pointFlower.area.y * 1.0;
        pointFlower.offset[2] = pointFlower.area.z * zpos;
        gl.uniform3fv(prog.uniforms.uOffset, pointFlower.offset);
        gl.drawArrays(gl.POINTS, 0, pointFlower.numFlowers);

        pointFlower.offset[0] = pointFlower.area.x * 1.0;
        pointFlower.offset[1] = pointFlower.area.y * -1.0;
        pointFlower.offset[2] = pointFlower.area.z * zpos;
        gl.uniform3fv(prog.uniforms.uOffset, pointFlower.offset);
        gl.drawArrays(gl.POINTS, 0, pointFlower.numFlowers);

        pointFlower.offset[0] = pointFlower.area.x * 1.0;
        pointFlower.offset[1] = pointFlower.area.y * 1.0;
        pointFlower.offset[2] = pointFlower.area.z * zpos;
        gl.uniform3fv(prog.uniforms.uOffset, pointFlower.offset);
        gl.drawArrays(gl.POINTS, 0, pointFlower.numFlowers);
      }

      pointFlower.offset[0] = 0.0;
      pointFlower.offset[1] = 0.0;
      pointFlower.offset[2] = 0.0;
      gl.uniform3fv(prog.uniforms.uOffset, pointFlower.offset);
      gl.drawArrays(gl.POINTS, 0, pointFlower.numFlowers);

      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      unuseShader(prog);

      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
    };

    const createEffectProgram = (vtxsrc: string, frgsrc: string, exunifs?: string[], exattrs?: string[]) => {
      const ret: any = {};
      let unifs = ["uResolution", "uSrc", "uDelta"];
      if (exunifs) unifs = unifs.concat(exunifs);
      let attrs = ["aPosition"];
      if (exattrs) attrs = attrs.concat(exattrs);
      ret.program = createShader(vtxsrc, frgsrc, unifs, attrs);
      useShader(ret.program);

      ret.dataArray = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);
      if (!gl) return ret;
      ret.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, ret.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, ret.dataArray, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      unuseShader(ret.program);
      return ret;
    };

    const useEffectProgram = (fxobj: any, srctex: any) => {
      if (!gl) return;
      const prog = fxobj.program;
      useShader(prog);
      gl.uniform3fv(prog.uniforms.uResolution, renderSpec.array);

      if (srctex != null) {
        gl.uniform2fv(prog.uniforms.uDelta, srctex.dtxArray);
        gl.uniform1i(prog.uniforms.uSrc, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, srctex.texture);
      }
    };

    const drawEffect = (fxobj: any) => {
      if (!gl) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, fxobj.buffer);
      gl.vertexAttribPointer(fxobj.program.attributes.aPosition, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const unuseEffectProgram = (fxobj: any) => {
      unuseShader(fxobj.program);
    };

    const createEffectLib = () => {
      const cmnvtxsrc = document.getElementById("fx_common_vsh")?.textContent || "";

      let frgsrc = document.getElementById("bg_fsh")?.textContent || "";
      effectLib.sceneBg = createEffectProgram(cmnvtxsrc, frgsrc, ["uTimes"], null);

      frgsrc = document.getElementById("fx_brightbuf_fsh")?.textContent || "";
      effectLib.mkBrightBuf = createEffectProgram(cmnvtxsrc, frgsrc, null, null);

      frgsrc = document.getElementById("fx_dirblur_r4_fsh")?.textContent || "";
      effectLib.dirBlur = createEffectProgram(cmnvtxsrc, frgsrc, ["uBlurDir"], null);

      const vtxsrc = document.getElementById("pp_final_vsh")?.textContent || "";
      frgsrc = document.getElementById("pp_final_fsh")?.textContent || "";
      effectLib.finalComp = createEffectProgram(vtxsrc, frgsrc, ["uBloom"], null);
    };

    const renderBackground = () => {
      if (!gl) return;
      gl.disable(gl.DEPTH_TEST);
      useEffectProgram(effectLib.sceneBg, null);
      gl.uniform2f(effectLib.sceneBg.program.uniforms.uTimes, timeInfo.elapsed, timeInfo.delta);
      drawEffect(effectLib.sceneBg);
      unuseEffectProgram(effectLib.sceneBg);
      gl.enable(gl.DEPTH_TEST);
    };

    const renderPostProcess = () => {
      if (!gl) return;
      gl.enable(gl.TEXTURE_2D);
      gl.disable(gl.DEPTH_TEST);

      const bindRT = (rt: any, isclear: boolean) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, rt.frameBuffer);
        gl.viewport(0, 0, rt.width, rt.height);
        if (isclear) {
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        }
      };

      bindRT(renderSpec.wHalfRT0, true);
      useEffectProgram(effectLib.mkBrightBuf, renderSpec.mainRT);
      drawEffect(effectLib.mkBrightBuf);
      unuseEffectProgram(effectLib.mkBrightBuf);

      for (let i = 0; i < 2; i++) {
        const p = 1.5 + 1 * i;
        const s = 2.0 + 1 * i;
        bindRT(renderSpec.wHalfRT1, true);
        useEffectProgram(effectLib.dirBlur, renderSpec.wHalfRT0);
        gl.uniform4f(effectLib.dirBlur.program.uniforms.uBlurDir, p, 0.0, s, 0.0);
        drawEffect(effectLib.dirBlur);
        unuseEffectProgram(effectLib.dirBlur);

        bindRT(renderSpec.wHalfRT0, true);
        useEffectProgram(effectLib.dirBlur, renderSpec.wHalfRT1);
        gl.uniform4f(effectLib.dirBlur.program.uniforms.uBlurDir, 0.0, p, 0.0, s);
        drawEffect(effectLib.dirBlur);
        unuseEffectProgram(effectLib.dirBlur);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, renderSpec.width, renderSpec.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      useEffectProgram(effectLib.finalComp, renderSpec.mainRT);
      gl.uniform1i(effectLib.finalComp.program.uniforms.uBloom, 1);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, renderSpec.wHalfRT0.texture);
      drawEffect(effectLib.finalComp);
      unuseEffectProgram(effectLib.finalComp);

      gl.enable(gl.DEPTH_TEST);
    };

    const renderScene = () => {
      if (!gl) return;
      Matrix44.loadLookAt(camera.matrix, camera.position, camera.lookat, camera.up);
      gl.enable(gl.DEPTH_TEST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, renderSpec.mainRT.frameBuffer);
      gl.viewport(0, 0, renderSpec.mainRT.width, renderSpec.mainRT.height);
      gl.clearColor(0.005, 0, 0.05, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      renderBackground();
      renderPointFlowers();
      renderPostProcess();
    };

    const setViewports = () => {
      if (!gl) return;
      renderSpec.setSize(gl.canvas.width || 0, gl.canvas.height || 0);
      gl.clearColor(0.2, 0.2, 0.5, 1.0);
      gl.viewport(0, 0, renderSpec.width, renderSpec.height);

      const rtfunc = (rtname: string, rtw: number, rth: number) => {
        const rt = renderSpec[rtname];
        if (rt) deleteRenderTarget(rt);
        renderSpec[rtname] = createRenderTarget(rtw, rth);
      };
      rtfunc("mainRT", renderSpec.width, renderSpec.height);
      rtfunc("wFullRT0", renderSpec.width, renderSpec.height);
      rtfunc("wFullRT1", renderSpec.width, renderSpec.height);
      rtfunc("wHalfRT0", renderSpec.halfWidth, renderSpec.halfHeight);
      rtfunc("wHalfRT1", renderSpec.halfWidth, renderSpec.halfHeight);
    };

    const makeCanvasFullScreen = (target: HTMLCanvasElement) => {
      const parent = target.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      target.width = rect.width;
      target.height = rect.height;
    };

    const onResize = () => {
      makeCanvasFullScreen(canvas);
      setViewports();
      if (sceneStandBy) {
        initScene();
      }
    };

    const createScene = () => {
      createEffectLib();
      createPointFlowers();
      sceneStandBy = true;
    };

    const initScene = () => {
      initPointFlowers();
      camera.position.z = pointFlower.area.z + projection.nearfar[0];
      projection.angle = (Math.atan2(pointFlower.area.y, camera.position.z + pointFlower.area.z) * 180.0) / Math.PI * 2.0;
      Matrix44.loadProjection(projection.matrix, renderSpec.aspect, projection.angle, projection.nearfar[0], projection.nearfar[1]);
    };

    const render = () => {
      renderScene();
    };

    const animate = () => {
      const curdate = new Date();
      timeInfo.elapsed = (curdate.getTime() - timeInfo.start) / 1000.0;
      timeInfo.delta = (curdate.getTime() - timeInfo.prev) / 1000.0;
      timeInfo.prev = curdate.getTime();
      if (animating) rafId = requestAnimationFrame(animate);
      render();
    };

    setAnimatingRef.current = (value: boolean) => {
      animating = value;
      if (animating) animate();
    };

    try {
      makeCanvasFullScreen(canvas);
      gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext;
    } catch (e) {
      console.error(e);
      return;
    }

    if (!gl) return;

    window.addEventListener("resize", onResize);
    setViewports();
    createScene();
    initScene();

    timeInfo.start = new Date().getTime();
    timeInfo.prev = timeInfo.start;
    animate();

    return () => {
      animating = false;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const toggleAnimation = () => {
    setIsAnimating((prev) => {
      const next = !prev;
      setAnimatingRef.current(next);
      if (!next) onStop?.();
      return next;
    });
  };

  useEffect(() => {
    setIsAnimating(active);
    setAnimatingRef.current(active);
    if (!active) return;
    if (!autoStopMs) return;
    const timeoutId = window.setTimeout(() => {
      setAnimatingRef.current(false);
      setIsAnimating(false);
      onStop?.();
    }, autoStopMs);
    return () => window.clearTimeout(timeoutId);
  }, [active, autoStopMs, onStop]);

  return (
    <div className={`sakura-stage ${className || ""}`} aria-hidden="true">
      <canvas id="sakura" ref={canvasRef} />
      {showToggleButton && (
        <div className="sakura-btnbg">
          <button type="button" onClick={toggleAnimation}>
            {isAnimating ? "Stop" : "Start"}
          </button>
        </div>
      )}
      <script id="sakura_point_vsh" type="x-shader/x_vertex" dangerouslySetInnerHTML={{ __html: SAKURA_POINT_VSH }} />
      <script id="sakura_point_fsh" type="x-shader/x_fragment" dangerouslySetInnerHTML={{ __html: SAKURA_POINT_FSH }} />
      <script id="fx_common_vsh" type="x-shader/x_vertex" dangerouslySetInnerHTML={{ __html: FX_COMMON_VSH }} />
      <script id="bg_fsh" type="x-shader/x_fragment" dangerouslySetInnerHTML={{ __html: BG_FSH }} />
      <script id="fx_brightbuf_fsh" type="x-shader/x_fragment" dangerouslySetInnerHTML={{ __html: FX_BRIGHTBUF_FSH }} />
      <script id="fx_dirblur_r4_fsh" type="x-shader/x_fragment" dangerouslySetInnerHTML={{ __html: FX_DIRBLUR_R4_FSH }} />
      <script id="fx_common_fsh" type="x-shader/x_fragment" dangerouslySetInnerHTML={{ __html: FX_COMMON_FSH }} />
      <script id="pp_final_vsh" type="x-shader/x_vertex" dangerouslySetInnerHTML={{ __html: PP_FINAL_VSH }} />
      <script id="pp_final_fsh" type="x-shader/x_fragment" dangerouslySetInnerHTML={{ __html: PP_FINAL_FSH }} />
    </div>
  );
};

const SAKURA_POINT_VSH = `uniform mat4 uProjection;
uniform mat4 uModelview;
uniform vec3 uResolution;
uniform vec3 uOffset;
uniform vec3 uDOF;  //x:focus distance, y:focus radius, z:max radius
uniform vec3 uFade; //x:start distance, y:half distance, z:near fade start

attribute vec3 aPosition;
attribute vec3 aEuler;
attribute vec2 aMisc; //x:size, y:fade

varying vec3 pposition;
varying float psize;
varying float palpha;
varying float pdist;

//varying mat3 rotMat;
varying vec3 normX;
varying vec3 normY;
varying vec3 normZ;
varying vec3 normal;

varying float diffuse;
varying float specular;
varying float rstop;
varying float distancefade;

void main(void) {
    // Projection is based on vertical angle
    vec4 pos = uModelview * vec4(aPosition + uOffset, 1.0);
    gl_Position = uProjection * pos;
    gl_PointSize = aMisc.x * uProjection[1][1] / -pos.z * uResolution.y * 0.5;
    
    pposition = pos.xyz;
    psize = aMisc.x;
    pdist = length(pos.xyz);
    palpha = smoothstep(0.0, 1.0, (pdist - 0.1) / uFade.z);
    
    vec3 elrsn = sin(aEuler);
    vec3 elrcs = cos(aEuler);
    mat3 rotx = mat3(
        1.0, 0.0, 0.0,
        0.0, elrcs.x, elrsn.x,
        0.0, -elrsn.x, elrcs.x
    );
    mat3 roty = mat3(
        elrcs.y, 0.0, -elrsn.y,
        0.0, 1.0, 0.0,
        elrsn.y, 0.0, elrcs.y
    );
    mat3 rotz = mat3(
        elrcs.z, elrsn.z, 0.0, 
        -elrsn.z, elrcs.z, 0.0,
        0.0, 0.0, 1.0
    );
    mat3 rotmat = rotx * roty * rotz;
    normal = rotmat[2];
    
    mat3 trrotm = mat3(
        rotmat[0][0], rotmat[1][0], rotmat[2][0],
        rotmat[0][1], rotmat[1][1], rotmat[2][1],
        rotmat[0][2], rotmat[1][2], rotmat[2][2]
    );
    normX = trrotm[0];
    normY = trrotm[1];
    normZ = trrotm[2];
    
    const vec3 lit = vec3(0.6917144638660746, 0.6917144638660746, -0.20751433915982237);
    
    float tmpdfs = dot(lit, normal);
    if(tmpdfs < 0.0) {
        normal = -normal;
        tmpdfs = dot(lit, normal);
    }
    diffuse = 0.4 + tmpdfs;
    
    vec3 eyev = normalize(-pos.xyz);
    if(dot(eyev, normal) > 0.0) {
        vec3 hv = normalize(eyev + lit);
        specular = pow(max(dot(hv, normal), 0.0), 20.0);
    }
    else {
        specular = 0.0;
    }
    
    rstop = clamp((abs(pdist - uDOF.x) - uDOF.y) / uDOF.z, 0.0, 1.0);
    rstop = pow(rstop, 0.5);
    //-0.69315 = ln(0.5)
    distancefade = min(1.0, exp((uFade.x - pdist) * 0.69315 / uFade.y));
}
`;

const SAKURA_POINT_FSH = `#ifdef GL_ES
//precision mediump float;
precision highp float;
#endif

uniform vec3 uDOF;  //x:focus distance, y:focus radius, z:max radius
uniform vec3 uFade; //x:start distance, y:half distance, z:near fade start

const vec3 fadeCol = vec3(0.08, 0.03, 0.06);

varying vec3 pposition;
varying float psize;
varying float palpha;
varying float pdist;

//varying mat3 rotMat;
varying vec3 normX;
varying vec3 normY;
varying vec3 normZ;
varying vec3 normal;

varying float diffuse;
varying float specular;
varying float rstop;
varying float distancefade;

float ellipse(vec2 p, vec2 o, vec2 r) {
    vec2 lp = (p - o) / r;
    return length(lp) - 1.0;
}

void main(void) {
    vec3 p = vec3(gl_PointCoord - vec2(0.5, 0.5), 0.0) * 2.0;
    vec3 d = vec3(0.0, 0.0, -1.0);
    float nd = normZ.z; //dot(-normZ, d);
    if(abs(nd) < 0.0001) discard;
    
    float np = dot(normZ, p);
    vec3 tp = p + d * np / nd;
    vec2 coord = vec2(dot(normX, tp), dot(normY, tp));
    
    //angle = 15 degree
    const float flwrsn = 0.258819045102521;
    const float flwrcs = 0.965925826289068;
    mat2 flwrm = mat2(flwrcs, -flwrsn, flwrsn, flwrcs);
    vec2 flwrp = vec2(abs(coord.x), coord.y) * flwrm;
    
    float r;
    if(flwrp.x < 0.0) {
        r = ellipse(flwrp, vec2(0.065, 0.024) * 0.5, vec2(0.36, 0.96) * 0.5);
    }
    else {
        r = ellipse(flwrp, vec2(0.065, 0.024) * 0.5, vec2(0.58, 0.96) * 0.5);
    }
    
    if(r > rstop) discard;
    
    vec3 col = mix(vec3(1.0, 0.8, 0.75), vec3(1.0, 0.9, 0.87), r);
    float grady = mix(0.0, 1.0, pow(coord.y * 0.5 + 0.5, 0.35));
    col *= vec3(1.0, grady, grady);
    col *= mix(0.8, 1.0, pow(abs(coord.x), 0.3));
    col = col * diffuse + specular;
    
    col = mix(fadeCol, col, distancefade);
    
    float alpha = (rstop > 0.001)? (0.5 - r / (rstop * 2.0)) : 1.0;
    alpha = smoothstep(0.0, 1.0, alpha) * palpha;
    
    gl_FragColor = vec4(col * 0.5, alpha);
}
`;

const FX_COMMON_VSH = `uniform vec3 uResolution;
attribute vec2 aPosition;

varying vec2 texCoord;
varying vec2 screenCoord;

void main(void) {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    texCoord = aPosition.xy * 0.5 + vec2(0.5, 0.5);
    screenCoord = aPosition.xy * vec2(uResolution.z, 1.0);
}
`;

const BG_FSH = `#ifdef GL_ES
//precision mediump float;
precision highp float;
#endif

uniform vec2 uTimes;

varying vec2 texCoord;
varying vec2 screenCoord;

void main(void) {
    vec3 col;
    float c;
    vec2 tmpv = texCoord * vec2(0.8, 1.0) - vec2(0.95, 1.0);
    c = exp(-pow(length(tmpv) * 1.8, 2.0));
    col = mix(vec3(0.02, 0.0, 0.03), vec3(0.96, 0.98, 1.0) * 1.5, c);
    gl_FragColor = vec4(col * 0.5, 1.0);
}
`;

const FX_BRIGHTBUF_FSH = `#ifdef GL_ES
//precision mediump float;
precision highp float;
#endif
uniform sampler2D uSrc;
uniform vec2 uDelta;

varying vec2 texCoord;
varying vec2 screenCoord;

void main(void) {
    vec4 col = texture2D(uSrc, texCoord);
    gl_FragColor = vec4(col.rgb * 2.0 - vec3(0.5), 1.0);
}
`;

const FX_DIRBLUR_R4_FSH = `#ifdef GL_ES
//precision mediump float;
precision highp float;
#endif
uniform sampler2D uSrc;
uniform vec2 uDelta;
uniform vec4 uBlurDir; //dir(x, y), stride(z, w)

varying vec2 texCoord;
varying vec2 screenCoord;

void main(void) {
    vec4 col = texture2D(uSrc, texCoord);
    col = col + texture2D(uSrc, texCoord + uBlurDir.xy * uDelta);
    col = col + texture2D(uSrc, texCoord - uBlurDir.xy * uDelta);
    col = col + texture2D(uSrc, texCoord + (uBlurDir.xy + uBlurDir.zw) * uDelta);
    col = col + texture2D(uSrc, texCoord - (uBlurDir.xy + uBlurDir.zw) * uDelta);
    gl_FragColor = col / 5.0;
}
`;

const FX_COMMON_FSH = `#ifdef GL_ES
//precision mediump float;
precision highp float;
#endif
uniform sampler2D uSrc;
uniform vec2 uDelta;

varying vec2 texCoord;
varying vec2 screenCoord;

void main(void) {
    gl_FragColor = texture2D(uSrc, texCoord);
}
`;

const PP_FINAL_VSH = `uniform vec3 uResolution;
attribute vec2 aPosition;
varying vec2 texCoord;
varying vec2 screenCoord;
void main(void) {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    texCoord = aPosition.xy * 0.5 + vec2(0.5, 0.5);
    screenCoord = aPosition.xy * vec2(uResolution.z, 1.0);
}
`;

const PP_FINAL_FSH = `#ifdef GL_ES
//precision mediump float;
precision highp float;
#endif
uniform sampler2D uSrc;
uniform sampler2D uBloom;
uniform vec2 uDelta;
varying vec2 texCoord;
varying vec2 screenCoord;
void main(void) {
    vec4 srccol = texture2D(uSrc, texCoord) * 2.0;
    vec4 bloomcol = texture2D(uBloom, texCoord);
    vec4 col;
    col = srccol + bloomcol * (vec4(1.0) + srccol);
    col *= smoothstep(1.0, 0.0, pow(length((texCoord - vec2(0.5)) * 2.0), 1.2) * 0.5);
    col = pow(col, vec4(0.45454545454545)); //(1.0 / 2.2)
    
    gl_FragColor = vec4(col.rgb, 1.0);
    gl_FragColor.a = 1.0;
}
`;

export default SakuraOverlay;
