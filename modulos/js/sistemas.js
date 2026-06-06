// Módulo 1: Sistemas de ecuaciones lineales para distribución de combustible.
// Todos los algoritmos están implementados desde cero en JavaScript.

const zoneLabels = ["Zona Norte", "Zona Centro", "Zona Sur", "Zona Este", "Zona Oeste"];
const methodDescriptions = {
  lu: `<p><strong>LU con pivoteo parcial.</strong> Se permutan filas para colocar el mayor pivote disponible en valor absoluto. Luego se factoriza la matriz como PA = LU y se resuelven dos sistemas triangulares: Ly = Pb y Ux = y. Es un método directo recomendado para matrices pequeñas.</p>`,
  jacobi: `<p><strong>Jacobi.</strong> Cada componente nueva se calcula usando únicamente los valores de la iteración anterior. Permite ver claramente la convergencia, pero puede ser lento y requiere condiciones favorables de la matriz.</p>`,
  gauss: `<p><strong>Gauss-Seidel.</strong> Actualiza cada variable en cuanto se calcula, por eso suele converger más rápido que Jacobi cuando la matriz es diagonalmente dominante.</p>`,
  sor: `<p><strong>SOR.</strong> Es una versión relajada de Gauss-Seidel. El parámetro omega acelera o estabiliza la convergencia: valores entre 1 y 2 intentan sobre-relajar la solución.</p>`,
  cg: `<p><strong>Gradiente Conjugado.</strong> Resuelve Ax = b minimizando el error en direcciones conjugadas. Es más adecuado si A es simétrica definida positiva.</p>`
};

let errorChart = null;

const $ = (id) => document.getElementById(id);
const methodSelect = $("method");
const sizeSelect = $("size");

function exampleSystem(n) {
  const A3 = [
    [10, -1, 2, 0, 0],
    [-1, 11, -1, 2, 0],
    [2, -1, 10, -1, 1],
    [0, 2, -1, 9, -2],
    [0, 0, 1, -2, 8]
  ];
  const b3 = [60, 75, 65, 55, 45];
  return {
    A: A3.slice(0, n).map(row => row.slice(0, n)),
    b: b3.slice(0, n)
  };
}

function renderMatrix(loadExample = true) {
  const n = Number(sizeSelect.value);
  const data = exampleSystem(n);
  let html = `<div class="mb-2 small text-muted">Ingresa la matriz A y el vector b. Cada fila representa una restricción logística del abastecimiento.</div>`;
  html += `<table class="table table-bordered table-sm align-middle"><thead><tr>`;
  for (let j = 0; j < n; j++) html += `<th>A${j + 1}</th>`;
  html += `<th>b</th></tr></thead><tbody>`;
  for (let i = 0; i < n; i++) {
    html += `<tr>`;
    for (let j = 0; j < n; j++) {
      const value = loadExample ? data.A[i][j] : 0;
      html += `<td><input class="form-control matrix-input aij" type="number" step="0.01" data-i="${i}" data-j="${j}" value="${value}"></td>`;
    }
    const bv = loadExample ? data.b[i] : 0;
    html += `<td><input class="form-control matrix-input bi" type="number" step="0.01" data-i="${i}" value="${bv}"></td></tr>`;
  }
  html += `</tbody></table>`;
  $("matrixGrid").innerHTML = html;
}

function updateMethodUI() {
  const method = methodSelect.value;
  const iterative = ["jacobi", "gauss", "sor", "cg"].includes(method);
  $("iterControls").classList.toggle("d-none", !iterative);
  $("omegaBox").classList.toggle("d-none", method !== "sor");
  $("iterPanel").classList.toggle("d-none", !iterative);
  $("chartPanel").classList.toggle("d-none", !iterative);
  $("algorithmText").innerHTML = methodDescriptions[method];
  $("message").innerHTML = "";
  $("iterTable").innerHTML = "";
  if (errorChart) errorChart.destroy();
}

function readSystem() {
  const n = Number(sizeSelect.value);
  const A = Array.from({ length: n }, () => Array(n).fill(0));
  const b = Array(n).fill(0);
  document.querySelectorAll(".aij").forEach(input => {
    A[Number(input.dataset.i)][Number(input.dataset.j)] = Number(input.value);
  });
  document.querySelectorAll(".bi").forEach(input => {
    b[Number(input.dataset.i)] = Number(input.value);
  });
  if (A.flat().some(v => !Number.isFinite(v)) || b.some(v => !Number.isFinite(v))) {
    throw new Error("Hay valores no numéricos en la matriz o en el vector b.");
  }
  return { A, b };
}

function cloneMatrix(A) { return A.map(row => row.slice()); }
function dot(a, b) { return a.reduce((s, ai, i) => s + ai * b[i], 0); }
function norm(v) { return Math.sqrt(dot(v, v)); }
function sub(a, b) { return a.map((ai, i) => ai - b[i]); }
function matVec(A, x) { return A.map(row => dot(row, x)); }

function luSolve(Ain, bin) {
  const A = cloneMatrix(Ain);
  const b = bin.slice();
  const n = A.length;
  const L = Array.from({ length: n }, () => Array(n).fill(0));
  const U = Array.from({ length: n }, () => Array(n).fill(0));
  const P = Array.from({ length: n }, (_, i) => i);

  // Eliminación con pivoteo parcial. Se guarda el factor en la parte inferior de A.
  for (let k = 0; k < n; k++) {
    let pivot = k;
    for (let i = k + 1; i < n; i++) {
      if (Math.abs(A[i][k]) > Math.abs(A[pivot][k])) pivot = i;
    }
    if (Math.abs(A[pivot][k]) < 1e-12) {
      throw new Error("Matriz singular o mal condicionada: el pivote es prácticamente cero.");
    }
    if (pivot !== k) {
      [A[k], A[pivot]] = [A[pivot], A[k]];
      [b[k], b[pivot]] = [b[pivot], b[k]];
      [P[k], P[pivot]] = [P[pivot], P[k]];
      for (let j = 0; j < k; j++) [L[k][j], L[pivot][j]] = [L[pivot][j], L[k][j]];
    }
    L[k][k] = 1;
    for (let i = k + 1; i < n; i++) {
      const factor = A[i][k] / A[k][k];
      L[i][k] = factor;
      for (let j = k; j < n; j++) A[i][j] -= factor * A[k][j];
    }
  }
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) U[i][j] = A[i][j];

  // Sustitución hacia adelante: Ly = Pb.
  const y = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < i; j++) sum += L[i][j] * y[j];
    y[i] = b[i] - sum;
  }

  // Sustitución hacia atrás: Ux = y.
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) sum += U[i][j] * x[j];
    if (Math.abs(U[i][i]) < 1e-12) throw new Error("Matriz singular durante la sustitución hacia atrás.");
    x[i] = (y[i] - sum) / U[i][i];
  }
  return { x, L, U, P };
}

function diagonalCheck(A) {
  for (let i = 0; i < A.length; i++) {
    if (Math.abs(A[i][i]) < 1e-12) throw new Error("No se puede iterar: existe un cero en la diagonal principal.");
  }
}

function jacobi(A, b, tol, maxIter) {
  diagonalCheck(A);
  const n = A.length;
  let x = Array(n).fill(0);
  const rows = [];
  for (let iter = 1; iter <= maxIter; iter++) {
    const nx = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) if (j !== i) sum += A[i][j] * x[j];
      nx[i] = (b[i] - sum) / A[i][i];
    }
    const err = norm(sub(nx, x)) / (norm(nx) || 1);
    rows.push({ iter, x: nx.slice(), err });
    x = nx;
    if (err < tol) break;
  }
  return { x, rows };
}

function gaussSeidel(A, b, tol, maxIter, omega = 1) {
  diagonalCheck(A);
  const n = A.length;
  let x = Array(n).fill(0);
  const rows = [];
  for (let iter = 1; iter <= maxIter; iter++) {
    const old = x.slice();
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) if (j !== i) sum += A[i][j] * x[j];
      const gsValue = (b[i] - sum) / A[i][i];
      x[i] = (1 - omega) * x[i] + omega * gsValue;
    }
    const err = norm(sub(x, old)) / (norm(x) || 1);
    rows.push({ iter, x: x.slice(), err });
    if (err < tol) break;
  }
  return { x, rows };
}

function isSymmetric(A) {
  for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) {
    if (Math.abs(A[i][j] - A[j][i]) > 1e-9) return false;
  }
  return true;
}

function conjugateGradient(A, b, tol, maxIter) {
  if (!isSymmetric(A)) throw new Error("Gradiente Conjugado requiere una matriz simétrica. Ajusta A o usa otro método.");
  const n = A.length;
  let x = Array(n).fill(0);
  let r = sub(b, matVec(A, x));
  let p = r.slice();
  let rsold = dot(r, r);
  const rows = [];
  if (Math.sqrt(rsold) < tol) return { x, rows };
  for (let iter = 1; iter <= maxIter; iter++) {
    const Ap = matVec(A, p);
    const denom = dot(p, Ap);
    if (Math.abs(denom) < 1e-14) throw new Error("Gradiente Conjugado se detuvo: la matriz puede no ser definida positiva.");
    const alpha = rsold / denom;
    x = x.map((xi, i) => xi + alpha * p[i]);
    r = r.map((ri, i) => ri - alpha * Ap[i]);
    const rsnew = dot(r, r);
    const err = Math.sqrt(rsnew) / (norm(b) || 1);
    rows.push({ iter, x: x.slice(), err });
    if (err < tol) break;
    p = r.map((ri, i) => ri + (rsnew / rsold) * p[i]);
    rsold = rsnew;
  }
  return { x, rows };
}

function renderSolution(x) {
  const list = x.map((v, i) => `<li><strong>${zoneLabels[i]}:</strong> ${format(v)} litros equivalentes</li>`).join("");
  const maxIdx = x.reduce((best, v, i) => v > x[best] ? i : best, 0);
  const neg = x.some(v => v < 0);
  return `<ul class="mb-3">${list}</ul>
    <p class="mb-0">La mayor asignación corresponde a <strong>${zoneLabels[maxIdx]}</strong>. ${neg ? "Aparece una asignación negativa; en contexto real eso indica que las restricciones ingresadas son incompatibles o deben reformularse." : "Las cantidades son positivas, por lo que el escenario es interpretable como reparto factible de combustible."}</p>`;
}

function renderIterTable(rows) {
  if (!rows || rows.length === 0) {
    $("iterTable").innerHTML = `<tbody><tr><td>No se generaron iteraciones.</td></tr></tbody>`;
    return;
  }
  let html = `<thead><tr><th>Iteración</th><th>Valores de x</th><th>Norma del error</th></tr></thead><tbody>`;
  rows.forEach(r => {
    html += `<tr><td>${r.iter}</td><td>${r.x.map(format).join(", ")}</td><td>${formatSci(r.err)}</td></tr>`;
  });
  html += `</tbody>`;
  $("iterTable").innerHTML = html;
}

function renderChart(rows) {
  const ctx = $("errorChart");
  if (errorChart) errorChart.destroy();
  errorChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: rows.map(r => r.iter),
      datasets: [{ label: "Error relativo", data: rows.map(r => r.err), tension: 0.25, fill: false }]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { type: "logarithmic", title: { display: true, text: "Error relativo" } }, x: { title: { display: true, text: "Iteración" } } } }
  });
}

function format(v) { return Number(v).toLocaleString("es-BO", { maximumFractionDigits: 4 }); }
function formatSci(v) { return Number(v).toExponential(3); }
function showError(msg) { $("message").innerHTML = `<div class="error-box">${msg}</div>`; }
function clearError() { $("message").innerHTML = ""; }

function solve() {
  try {
    clearError();
    const { A, b } = readSystem();
    const method = methodSelect.value;
    let result;
    if (method === "lu") {
      result = luSolve(A, b);
      $("solution").innerHTML = renderSolution(result.x);
      $("iterPanel").classList.add("d-none");
      $("chartPanel").classList.add("d-none");
      $("message").innerHTML = `<div class="success-box">Cálculo directo completado con pivoteo parcial.</div>`;
    } else {
      const tol = Number($("tol").value);
      const maxIter = Number($("maxIter").value);
      if (!(tol > 0) || !(maxIter > 0)) throw new Error("La tolerancia y el máximo de iteraciones deben ser positivos.");
      if (method === "jacobi") result = jacobi(A, b, tol, maxIter);
      if (method === "gauss") result = gaussSeidel(A, b, tol, maxIter, 1);
      if (method === "sor") {
        const omega = Number($("omega").value);
        if (!(omega > 0 && omega < 2)) throw new Error("Omega debe estar entre 0 y 2 para SOR.");
        result = gaussSeidel(A, b, tol, maxIter, omega);
      }
      if (method === "cg") result = conjugateGradient(A, b, tol, maxIter);
      $("iterPanel").classList.remove("d-none");
      $("chartPanel").classList.remove("d-none");
      renderIterTable(result.rows);
      renderChart(result.rows);
      const last = result.rows[result.rows.length - 1];
      $("solution").innerHTML = renderSolution(result.x) + `<p class="mt-3 mb-0"><strong>Iteraciones usadas:</strong> ${result.rows.length}. <strong>Error final:</strong> ${last ? formatSci(last.err) : "0"}.</p>`;
      $("message").innerHTML = `<div class="success-box">Método iterativo ejecutado. Revisa la tabla y el gráfico para evaluar la convergencia.</div>`;
    }
  } catch (err) {
    showError(err.message);
  }
}

methodSelect.addEventListener("change", updateMethodUI);
sizeSelect.addEventListener("change", () => { renderMatrix(true); });
$("loadExample").addEventListener("click", () => renderMatrix(true));
$("solveBtn").addEventListener("click", solve);

renderMatrix(true);
updateMethodUI();
