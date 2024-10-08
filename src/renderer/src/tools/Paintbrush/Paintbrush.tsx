import { VincentBaseTool } from "@renderer/api/VincentBaseTool";
import getCursorPositionOnCanvas from "@renderer/util/getCursorPositionOnCanvas";
import { createSignal, JSXElement } from "solid-js";
import style from './Paintbrush.module.css';
import { state } from "@renderer/state/StateController";
// import { commitCanvasChange } from "@renderer/util/commitCanvasChange";

import vertexShaderCode from './Paintbrush.vert?raw';
import fragmentShaderCode from './Paintbrush.frag?raw';

class PaintbrushTool extends VincentBaseTool {
  drawing = false;

  selectionArea: ImageData | null = null;

  lastPosX = 0;
  lastPosY = 0;
  lastSize = 0;

  cursorElem!: HTMLDivElement;

  getBrushSize;
  setBrushSize;
  getBrushColor;
  setBrushColor;
  getCursorVisible;
  setCursorVisible;

  constructor() {
    super({
      name: `paintbrush`,
      namespace: `vincent`,
      category: `drawing`
    });

    const [ brushSize, setBrushSize ] = createSignal<number>(10);
    const [ brushColor, setBrushColor ] = createSignal<string>(`#000000`);
    const [ cursorVisible, setCursorVisible ] = createSignal<boolean>(false);
    this.getBrushSize = brushSize;
    this.setBrushSize = setBrushSize;
    this.getBrushColor = brushColor;
    this.setBrushColor = setBrushColor;
    this.getCursorVisible = cursorVisible;
    this.setCursorVisible = setCursorVisible;
  }

  _startDrawing(ev: PointerEvent): void {
    const curPos = getCursorPositionOnCanvas(ev.pageX,  ev.pageY);
    this.lastPosX = curPos.x;
    this.lastPosY = curPos.y;

    this.drawing = true;
    this._updateCursor(ev);
  }

  _finishDrawing(): void {
    if (!this.drawing) return;
    this.drawing = false;

    // commitCanvasChange();
  }

  // async _masktest(): Promise<void> {
  // }

  // TODO: use coalesced events
  // see: https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents
  _updateCursor(ev: PointerEvent): void {
    this.cursorElem.style.top = ev.clientY + `px`;
    this.cursorElem.style.left = ev.clientX + `px`;
    this.cursorElem.style.width = (this.getBrushSize() * state.canvas.scale) + `px`;
    this.cursorElem.style.height = (this.getBrushSize() * state.canvas.scale) + `px`;

    const curPos = getCursorPositionOnCanvas(ev.pageX,  ev.pageY);
    let curSize = this.getBrushSize();

    // console.debug(curPos);

    // ev.pressure is always either 0 or 0.5 for other pointer types
    // so we only use it if an actual pen is being used
    if (ev.pointerType === `pen`) {
      curSize = ev.pressure * this.getBrushSize();
    }

    if (this.drawing) {
      const gl = state.canvas.main!.getContext(`webgl2`);
      if (gl == null) {
        throw new Error(`could not get webgl context`);
      }

      const aspect = state.canvas.main!.width / state.canvas.main!.height;

      // mesh vertices
      const vertices: number[] = [
        // tri 1
        -1, 1, 0,
        -1, -1, 0,
        1, -1, 0,
        // tri 2
        -1, 1, 0,
        1, 1, 0,
        1, -1, 0
      ];

      const texcoord: number[] = [];

      // apply scale and position to vertices
      for (let i = 0; i < vertices.length; i++) {
        if (i % 3 === 2) continue;

        texcoord.push(vertices[i]);

        const size = curSize / state.canvas.main!.height;

        if (i % 3 === 0) {
          // x
          vertices[i] *= size / aspect;
          vertices[i] += curPos.gpuX;
        } else {
          // y
          vertices[i] *= size;
          vertices[i] += curPos.gpuY;
        }
      }

      // color
      const col = this.getBrushColor() as string;
      const hexVals = col.substring(1).match(/.{2}/g) ?? [];
      const rawColor: number[] = [];
      for (const hex of hexVals) {
        rawColor.push(parseInt(hex, 16) / 255);
      }
      
      rawColor.push(1.0); // opacity

      gl.blendFunc(gl.ONE, gl.ONE);
  
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

      const colorBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rawColor), gl.STATIC_DRAW);

      const uvBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoord), gl.STATIC_DRAW);

      const vs = gl.createShader(gl.VERTEX_SHADER) as WebGLShader;
      gl.shaderSource(vs, vertexShaderCode);
      gl.compileShader(vs);

      const fs = gl.createShader(gl.FRAGMENT_SHADER) as WebGLShader;
      gl.shaderSource(fs, fragmentShaderCode);
      gl.compileShader(fs);

      const program = gl.createProgram() as WebGLProgram;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);

      gl.linkProgram(program);

      const positionLocation = gl.getAttribLocation(program, `position`);
      gl.enableVertexAttribArray(positionLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

      const colorLocation = gl.getAttribLocation(program, `color`);
      gl.enableVertexAttribArray(colorLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);

      const uvLocation = gl.getAttribLocation(program, `uv`);
      gl.enableVertexAttribArray(uvLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);

      gl.useProgram(program);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    this.lastPosX = curPos.x;
    this.lastPosY = curPos.y;
    this.lastSize = curSize;
  }

  // pointerEnter(ev: PointerEvent): void {
    
  // }

  pointerDown(ev: PointerEvent): void {
    if (state.canvas.wrapper?.contains(ev.target as Element)) {
      this._startDrawing(ev);
    }
  }

  pointerMove(ev: PointerEvent): void {
    this._updateCursor(ev);
    if (state.canvas.wrapper?.contains(ev.target as Element)) {
      this.setCursorVisible(true);
    } else {
      this.setCursorVisible(false);
    }
  }

  pointerChange(ev: PointerEvent): void {
    this._updateCursor(ev);
  }

  pointerUp(): void {
    this._finishDrawing();
  }

  pointerOut(ev: PointerEvent): void {
    if (ev.pointerType === `pen`) this._finishDrawing();
  }

  pointerLeave(ev: PointerEvent): void {
    if (ev.pointerType === `pen`) this._finishDrawing();
  }

  pointerCancel(): void {
    this._finishDrawing();
  }

  getOptionsComponent(): JSXElement {
    return (
      <>
        <label>
          brush size: 
          <input type="number" value={this.getBrushSize()} onChange={(ev) => this.setBrushSize(parseInt(ev.target.value))} />
        </label>
        <label>
          brush color: 
          <input type="color" value={this.getBrushColor()} onChange={(ev) => this.setBrushColor(ev.target.value)} />
        </label>
      </>
    );
  }

  getWidgets(): JSXElement {
    return (
      <div 
        class={style.brushCursor}
        classList={{ [style.cursorVisible]: this.getCursorVisible() }}
        ref={this.cursorElem}
      />
    );
  }
}

export default new PaintbrushTool();