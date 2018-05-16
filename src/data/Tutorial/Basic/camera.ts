export default {
  html: `<script src="https://unpkg.com/@webglrun/wutils"></script>
<script src="https://unpkg.com/v3js"></script>
<canvas id="webgl" width="400" height="400"></canvas>
<p>Use W, A, S, D, Space, Shift to move the eye, use ←,→,↑,↓ to move the line of sight. </p>
<p id="eye"></p>
<p id="center"></p>
<p id="up"></p><br>
<p id="matrix"></p>`,
  css: `p {
  margin: 0;
  color: #fff;
}

#matrix {
  white-space: pre;
}`,
  js: `// 向量在坐标系中的变换
// http://www.cnblogs.com/dojo-lzz/p/7223364.html

let $eye = document.getElementById('eye')
let $center = document.getElementById('center')
let $up = document.getElementById('up')
let $matrix = document.getElementById('matrix')
let canvas = document.getElementById('webgl')
let gl = canvas.getContext('webgl')

// 装载 shader
wutils.initProgramWithShadersSource(
  gl,
  $shaders.vertexShader,
  $shaders.fragmentShader,
)

// 取得变量并赋值
let a_Position = gl.getAttribLocation(gl.program, 'a_Position')
let a_Color = gl.getAttribLocation(gl.program, 'a_Color')
let u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix')

// 重置背景色
gl.clearColor(1.0, 1.0, 1.0, 1.0)

// 在 Float32Array 类型化数组里定义三个点的位置
let count = 9
let vertices = new Float32Array([
  0.0, 0.5, -0.4, 1.0, 0.0, 0.0,
  -0.5, -0.5, -0.4, 1.0, 0.0, 0.0,
  0.5, -0.5, -0.4, 1.0, 0.0, 0.0,
  0.0, -0.5, -0.2, 0.0, 1.0, 0.0,
  -0.5, 0.5, -0.2, 0.0, 1.0, 0.0,
  0.5, 0.5, -0.2, 0.0, 1.0, 0.0,
  0.0, 0.5, 0.0, 0.0, 0.0, 1.0,
  -0.5, -0.5, 0.0, 0.0, 0.0, 1.0,
  0.5, -0.5, 0.0, 0.0, 0.0, 1.0
])

// 根据摄像机参数构建摄像机矩阵
// 提供参数：视点 eye，观察目标点 center, 上方向 up
let eye = new v3.Vector3(0, 0, 0.2)
let center = new v3.Vector3(0, 0, 0)
let up = new v3.Vector3(0, 1, 0)

function render(eye, center, up) {
  // 构建新坐标轴
  // z轴 = eye - center
  let z = v3.Vector3.plus(eye, v3.Vector3.negate(center))
  z.normalize()
  let y = up
  y.normalize()
  let x = v3.Vector3.crossProduct(y, z)
  x.normalize()

  // 构建旋转矩阵
  let rMatrix = new v3.RotationMatrix(
    ...x,
    ...y,
    ...z
  )

  // 构建平移矩阵
  let tMatrix = new v3.Matrix4x3()
  tMatrix.identity()
  tMatrix.setTranslation(eye)

  // 构建复合矩阵，且求逆(物体绝对位置不动，是坐标轴变动了，物体相对坐标轴做反向运动)
  // C = R*T
  // C^-1 = T^-1*R^-1 正交矩阵的逆等于其转置
  // C^-1 = T^-1 * R^t 反向平移 + 反向旋转
  tMatrix.setTranslation(v3.Vector3.negate(eye))
  rMatrix.transpose()
  let composedMatrix = new v3.Matrix4x3.matrix4x3Multiply(tMatrix, rMatrix)

  gl.uniformMatrix4fv(u_ViewMatrix, false, composedMatrix.getMat4FloatArray())

  let vertexBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

  let FZIE = vertices.BYTES_PER_ELEMENT

  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FZIE * 6, 0)
  gl.enableVertexAttribArray(a_Position)

  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FZIE * 6, FZIE * 3)
  gl.enableVertexAttribArray(a_Color)

  gl.clear(gl.COLOR_BUFFER_BIT)

  // 画三角
  gl.drawArrays(gl.TRIANGLES, 0, count)
  showCoord(composedMatrix)
}

// 显示参数
function showCoord(composedMatrix) {
  $eye.innerHTML = \`eye: \${eye.x.toFixed(2)}, \${eye.y.toFixed(2)}, \${eye.z.toFixed(2)}\`
  $center.innerHTML = \`center: \${center.x.toFixed(2)}, \${center.y.toFixed(2)}, \${center.z.toFixed(2)}\`
  $up.innerHTML = \`up: \${up.x.toFixed(2)}, \${up.y.toFixed(2)}, \${up.z.toFixed(2)}\`
  $matrix.innerHTML = \`transform matrix:
\${composedMatrix.m11.toFixed(2)},  \${composedMatrix.m12.toFixed(2)},  \${composedMatrix.m13.toFixed(2)},  \${composedMatrix.m14.toFixed(2)},
\${composedMatrix.m21.toFixed(2)},  \${composedMatrix.m22.toFixed(2)},  \${composedMatrix.m23.toFixed(2)},  \${composedMatrix.m24.toFixed(2)},
\${composedMatrix.m31.toFixed(2)},  \${composedMatrix.m32.toFixed(2)},  \${composedMatrix.m33.toFixed(2)},  \${composedMatrix.m34.toFixed(2)},
\${composedMatrix.tx.toFixed(2)},  \${composedMatrix.ty.toFixed(2)},  \${composedMatrix.tz.toFixed(2)},  \${composedMatrix.tw.toFixed(2)}\`
}

render(eye, center, up)

// 注册键盘事件
document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case ('w'): {
      let z = eye.z - 0.01
      if (z < -1) z = -1
      eye = new v3.Vector3(eye.x, eye.y, z)
      break
    }
    case ('s'): {
      let z = eye.z + 0.01
      if (z > 1) z = 1
      eye = new v3.Vector3(eye.x, eye.y, z)
      break
    }
    case ('a'): {
      let x = eye.x - 0.01
      if (x < -1) x = -1
      eye = new v3.Vector3(x, eye.y, eye.z)
      break
    }
    case ('d'): {
      let x = eye.x + 0.01
      if (x > 1) x = 1
      eye = new v3.Vector3(x, eye.y, eye.z)
      break
    }
    case (' '): {
      let y = eye.y + 0.01
      if (y > 1) y = 1
      eye = new v3.Vector3(eye.x, y, eye.z)
      break
    }
    case ('Shift'): {
      let y = eye.y - 0.01
      if (y < -1) y = -1
      eye = new v3.Vector3(eye.x, y, eye.z)
      break
    }
    case ('ArrowUp'): {
      let y = center.y + 0.01
      if (y > 1) y = 1
      center = new v3.Vector3(center.x, y, center.z)
      break
    }
    case ('ArrowDown'): {
      let y = center.y - 0.01
      if (y < -1) y = -1
      center = new v3.Vector3(center.x, y, center.z)
      break
    }
    case ('ArrowLeft'): {
      let x = center.x - 0.01
      if (x < -1) x = -1
      center = new v3.Vector3(x, center.y, center.z)
      break
    }
    case ('ArrowRight'): {
      let x = center.x + 0.01
      if (x > 1) x = 1
      center = new v3.Vector3(x, center.y, center.z)
      break
    }
  }
  render(eye, center, up)
})`,
  glsl: {
    vertexShader: `// 定义 attribute 变量
attribute vec4 a_Position;
attribute vec4 a_Color;
uniform mat4 u_ViewMatrix;
varying vec4 v_Color;
void main() {
  gl_Position = u_ViewMatrix * a_Position;
  v_Color = a_Color;
}`,
    fragmentShader: `precision mediump float;
varying vec4 v_Color;
void main() {
  gl_FragColor = v_Color;
}`
  }
}