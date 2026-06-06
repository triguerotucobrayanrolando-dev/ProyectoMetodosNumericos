// Módulo 6: Rumores de desabastecimiento y pánico de compra.
// Se compara un sistema base Ax=b contra un sistema perturbado por aumento de demanda,
// reducción de rutas y pequeñas variaciones de información social.

const $ = (id) => document.getElementById(id);
const zoneLabels = ["Zona Norte", "Zona Centro", "Zona Sur", "Zona Este", "Zona Oeste"];
let rumorChart = null;
let errorChart = null;

const scenarios = {
  bajo: { demand: 5, routes: 2, text: "Rumor bajo: incremento moderado de compras preventivas." },
  medio: { demand: 12, routes: 6, text: "Rumor medio: la demanda empieza a presionar la red de reparto." },
  alto: { demand: 25, routes: 12, text: "Rumor alto: varias rutas y mercados reciben presión adicional." },
  panico: { demand: 45, routes: 20, text: "Pánico de compra: la demanda se acelera y la red se vuelve sensible." }
};

const methodText = {
  lu: `<p><strong>LU con pivoteo parcial.</strong> Resuelve directamente el sistema mediante permutación de filas, factorización triangular y sustitución hacia adelante/atrás. Es útil para comparar el escenario base con el perturbado.</p>`,
  jacobi: `<p><strong>Jacobi.</strong> Calcula cada componente con los valores de la iteración anterior. La tabla y el gráfico muestran si el escenario perturbado converge o se vuelve numéricamente inestable.</p>`,
  gauss: `<p><strong>Gauss-Seidel.</strong> Actualiza las variables inmediatamente. Suele converger mejor que Jacobi en matrices diagonalmente dominantes.</p>`,
  sor: `<p><strong>SOR.</strong> Introduce una relajación omega para acelerar o estabilizar Gauss-Seidel. Si omega es excesivo puede provocar divergencia.</p>`,
  cg: `<p><strong>Gradiente Conjugado.</strong> Trabaja con direcciones conjugadas y se recomienda para matrices simétricas definidas positivas. Si la red no cumple esa condición se debe usar otro método.</p>`
};

function exampleSystem(n) {
  // Matrices simétricas casi singulares: las filas son muy parecidas y la diagonal apenas domina.
  // Esto permite estudiar sistemas mal condicionados sin perder la posibilidad de resolverlos.
  const variants = {
    2: {
      A: [[6.0, -5.7], [-5.7, 6.0]],
      b: [48, 55]
    },
    3: {
      A: [[8.0, -5.9, -1.9], [-5.9, 8.0, -2.0], [-1.9, -2.0, 4.1]],
      b: [48, 55, 50]
    },
    4: {
      A: [[9.0, -4.0, -2.2, -2.5], [-4.0, 9.0, -2.4, -2.3], [-2.2, -2.4, 7.0, -2.2], [-2.5, -2.3, -2.2, 7.2]],
      b: [48, 55, 50, 44]
    },
    5: {
      A: [[10.0, -4.2, -2.1, -1.6, -1.9], [-4.2, 10.0, -2.3, -1.5, -1.8], [-2.1, -2.3, 8.7, -2.0, -2.0], [-1.6, -1.5, -2.0, 7.2, -1.9], [-1.9, -1.8, -2.0, -1.9, 7.8]],
      b: [48, 55, 50, 44, 39]
    }
  };
  return variants[n];
}

function renderMatrix(loadExample = true) {
  const n = Number($("size").value);
  const data = exampleSystem(n);
  let html = `<div class="mb-2 small text-muted">A modela restricciones/capacidades de rutas y b la demanda normal por zona. Edita los datos para crear tu propio escenario.</div>`;
  html += `<table class="table table-bordered table-sm align-middle"><thead><tr>`;
  for (let j = 0; j < n; j++) html += `<th>A${j + 1}</th>`;
  html += `<th>b</th></tr></thead><tbody>`;
  for (let i = 0; i < n; i++) {
    html += `<tr>`;
    for (let j = 0; j < n; j++) {
      html += `<td><input class="form-control matrix-input aij" type="number" step="0.01" data-i="${i}" data-j="${j}" value="${loadExample ? data.A[i][j] : 0}"></td>`;
    }
    html += `<td><input class="form-control matrix-input bi" type="number" step="0.01" data-i="${i}" value="${loadExample ? data.b[i] : 0}"></td></tr>`;
  }
  html += `</tbody></table>`;
  $("matrixGrid").innerHTML = html;
}

function readSystem() {
  const n = Number($("size").value);
  const A = Array.from({ length: n }, () => Array(n).fill(0));
  const b = Array(n).fill(0);
  document.querySelectorAll(".aij").forEach(input => A[Number(input.dataset.i)][Number(input.dataset.j)] = Number(input.value));
  document.querySelectorAll(".bi").forEach(input => b[Number(input.dataset.i)] = Number(input.value));
  if (A.flat().some(v => !Number.isFinite(v)) || b.some(v => !Number.isFinite(v))) throw new Error("Hay valores no numéricos en A o b.");
  return { A, b };
}

function cloneMatrix(A) { return A.map(row => row.slice()); }
function dot(a, b) { return a.reduce((s, ai, i) => s + ai * b[i], 0); }
function sub(a, b) { return a.map((ai, i) => ai - b[i]); }
function add(a, b) { return a.map((ai, i) => ai + b[i]); }
function scale(v, c) { return v.map(vi => vi * c); }
function norm2(v) { return Math.sqrt(dot(v, v)); }
function normInfVector(v) { return Math.max(...v.map(x => Math.abs(x))); }
function normInfMatrix(A) { return Math.max(...A.map(row => row.reduce((s, x) => s + Math.abs(x), 0))); }
function matVec(A, x) { return A.map(row => dot(row, x)); }

function luSolve(Ain, bin) {
  const A = cloneMatrix(Ain);
  const b = bin.slice();
  const n = A.length;
  const L = Array.from({ length: n }, () => Array(n).fill(0));

  // Pivoteo parcial para disminuir errores por pivotes pequeños.
  for (let k = 0; k < n; k++) {
    let pivot = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > Math.abs(A[pivot][k])) pivot = i;
    if (Math.abs(A[pivot][k]) < 1e-12) throw new Error("Matriz singular o mal condicionada: pivote casi cero.");
    if (pivot !== k) {
      [A[k], A[pivot]] = [A[pivot], A[k]];
      [b[k], b[pivot]] = [b[pivot], b[k]];
      for (let j = 0; j < k; j++) [L[k][j], L[pivot][j]] = [L[pivot][j], L[k][j]];
    }
    L[k][k] = 1;
    for (let i = k + 1; i < n; i++) {
      const factor = A[i][k] / A[k][k];
      L[i][k] = factor;
      for (let j = k; j < n; j++) A[i][j] -= factor * A[k][j];
    }
  }

  const y = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < i; j++) sum += L[i][j] * y[j];
    y[i] = b[i] - sum;
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) sum += A[i][j] * x[j];
    if (Math.abs(A[i][i]) < 1e-12) throw new Error("Matriz singular durante la sustitución hacia atrás.");
    x[i] = (y[i] - sum) / A[i][i];
  }
  return { x, rows: [] };
}

function diagonalCheck(A) {
  for (let i = 0; i < A.length; i++) if (Math.abs(A[i][i]) < 1e-12) throw new Error("No se puede iterar: hay un cero en la diagonal.");
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
    const err = norm2(sub(nx, x)) / (norm2(nx) || 1);
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
      const candidate = (b[i] - sum) / A[i][i];
      x[i] = (1 - omega) * x[i] + omega * candidate;
    }
    const err = norm2(sub(x, old)) / (norm2(x) || 1);
    rows.push({ iter, x: x.slice(), err });
    if (err < tol) break;
  }
  return { x, rows };
}

function isSymmetric(A) {
  for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) if (Math.abs(A[i][j] - A[j][i]) > 1e-9) return false;
  return true;
}

function conjugateGradient(A, b, tol, maxIter) {
  if (!isSymmetric(A)) throw new Error("Gradiente Conjugado requiere matriz simétrica. Usa LU, Jacobi, Gauss-Seidel o SOR para este caso.");
  const n = A.length;
  let x = Array(n).fill(0);
  let r = sub(b, matVec(A, x));
  let p = r.slice();
  let rsold = dot(r, r);
  const rows = [];
  for (let iter = 1; iter <= maxIter; iter++) {
    const Ap = matVec(A, p);
    const denom = dot(p, Ap);
    if (Math.abs(denom) < 1e-14) throw new Error("Gradiente Conjugado se detuvo: la matriz puede no ser definida positiva.");
    const alpha = rsold / denom;
    x = add(x, scale(p, alpha));
    r = sub(r, scale(Ap, alpha));
    const rsnew = dot(r, r);
    const err = Math.sqrt(rsnew) / (norm2(b) || 1);
    rows.push({ iter, x: x.slice(), err });
    if (err < tol) break;
    p = add(r, scale(p, rsnew / rsold));
    rsold = rsnew;
  }
  return { x, rows };
}

function solveWithSelected(A, b) {
  const method = $("solver").value;
  if (method === "lu") return luSolve(A, b);
  const tol = Number($("tol").value);
  const maxIter = Number($("maxIter").value);
  if (!(tol > 0) || !(maxIter > 0)) throw new Error("Tolerancia y máximo de iteraciones deben ser positivos.");
  if (method === "jacobi") return jacobi(A, b, tol, maxIter);
  if (method === "gauss") return gaussSeidel(A, b, tol, maxIter, 1);
  if (method === "sor") {
    const omega = Number($("omega").value);
    if (!(omega > 0 && omega < 2)) throw new Error("Omega debe estar entre 0 y 2.");
    return gaussSeidel(A, b, tol, maxIter, omega);
  }
  return conjugateGradient(A, b, tol, maxIter);
}

function perturbSystem(A, b, demandRise, routeLoss) {
  const demandFactor = 1 + demandRise / 100;
  const routeFactor = routeLoss / 100;
  const bp = b.map((bi, i) => bi * demandFactor * (1 + 0.01 * i));
  const Ap = A.map((row, i) => row.map((aij, j) => {
    // Se reduce más el acoplamiento entre zonas que la capacidad local.
    const loss = i === j ? routeFactor * 0.35 : routeFactor;
    return aij * (1 - loss);
  }));
  return { Ap, bp };
}

function smallPerturbedB(b, pct) {
  const p = pct / 100;
  return b.map((bi, i) => bi * (1 + p * (i % 2 === 0 ? 1 : -0.6)));
}

function inverseByLU(A) {
  const n = A.length;
  const columns = [];
  for (let j = 0; j < n; j++) {
    const e = Array(n).fill(0);
    e[j] = 1;
    columns.push(luSolve(A, e).x);
  }
  return Array.from({ length: n }, (_, i) => columns.map(col => col[i]));
}

function conditionNumber(A) {
  const inv = inverseByLU(A);
  return normInfMatrix(A) * normInfMatrix(inv);
}

function renderCompareTable(base, crisis) {
  let html = `<thead><tr><th>Zona</th><th>Base</th><th>Con rumor</th><th>Cambio</th><th>Cambio %</th></tr></thead><tbody>`;
  base.forEach((v, i) => {
    const diff = crisis[i] - v;
    const pct = 100 * diff / (Math.abs(v) || 1);
    html += `<tr><td>${zoneLabels[i]}</td><td>${fmt(v)}</td><td>${fmt(crisis[i])}</td><td>${fmt(diff)}</td><td>${fmt(pct)}%</td></tr>`;
  });
  $("compareTable").innerHTML = html + `</tbody>`;
}

function renderRumorChart(base, crisis) {
  if (rumorChart) rumorChart.destroy();
  rumorChart = new Chart($("rumorChart"), {
    type: "bar",
    data: {
      labels: base.map((_, i) => zoneLabels[i]),
      datasets: [
        { label: "Reparto base", data: base },
        { label: "Escenario con rumor", data: crisis }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { title: { display: true, text: "Litros equivalentes" } } } }
  });
}

function renderIterTable(rows) {
  if (!rows || rows.length === 0) {
    $("iterTable").innerHTML = `<tbody><tr><td>El método directo LU no genera tabla iterativa.</td></tr></tbody>`;
    return;
  }
  let html = `<thead><tr><th>Iteración</th><th>Valores de x</th><th>Error relativo</th></tr></thead><tbody>`;
  rows.forEach(r => html += `<tr><td>${r.iter}</td><td>${r.x.map(fmt).join(", ")}</td><td>${sci(r.err)}</td></tr>`);
  $("iterTable").innerHTML = html + `</tbody>`;
}

function renderErrorChart(rows) {
  if (errorChart) errorChart.destroy();
  if (!rows || rows.length === 0) return;
  errorChart = new Chart($("errorChart"), {
    type: "line",
    data: { labels: rows.map(r => r.iter), datasets: [{ label: "Error relativo", data: rows.map(r => r.err), tension: 0.25 }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { type: "logarithmic", title: { display: true, text: "Error" } }, x: { title: { display: true, text: "Iteración" } } } }
  });
}

function renderResult(base, crisis, sensitivity, cond, scenarioLabel, smallBChange, smallXChange) {
  const maxIdx = crisis.reduce((best, v, i) => Math.abs(v - base[i]) > Math.abs(crisis[best] - base[best]) ? i : best, 0);
  const relMax = 100 * Math.abs(crisis[maxIdx] - base[maxIdx]) / (Math.abs(base[maxIdx]) || 1);
  const warning = cond > 100 ? "error-box" : cond > 30 ? "success-box" : "success-box";
  $("result").innerHTML = `
    <p class="mb-2"><strong>Escenario:</strong> ${scenarioLabel}</p>
    <p class="mb-2"><strong>Número de condición estimado ||A||∞||A⁻¹||∞:</strong> ${fmt(cond)}.</p>
    <div class="${warning} mb-3">Zona más afectada: <strong>${zoneLabels[maxIdx]}</strong>, con cambio relativo aproximado de ${fmt(relMax)}%.</div>
    <p class="mb-2"><strong>Sensibilidad medida:</strong> una perturbación de demanda de ${fmt(smallBChange)}% produjo un cambio relativo de solución de ${fmt(smallXChange)}%.</p>
    <p class="mb-0">Interpretación: si el número de condición y la sensibilidad son altos, un rumor pequeño puede amplificar la demanda y alterar fuertemente el reparto calculado. El resultado no afirma una causa política; solo muestra cómo una red logística acoplada puede volverse vulnerable ante cambios de información y consumo.</p>`;
}

function analyze() {
  try {
    $("message").innerHTML = "";
    const { A, b } = readSystem();
    const demandRise = Number($("demandRise").value);
    const routeLoss = Number($("routeLoss").value);
    const tinyPert = Number($("tinyPert").value);
    if (![demandRise, routeLoss, tinyPert].every(Number.isFinite)) throw new Error("Los porcentajes del escenario deben ser numéricos.");
    if (routeLoss >= 95) throw new Error("La reducción de rutas es demasiado alta y puede anular la matriz.");

    const base = luSolve(A, b).x;
    const { Ap, bp } = perturbSystem(A, b, demandRise, routeLoss);
    const crisisResult = solveWithSelected(Ap, bp);
    const crisis = crisisResult.x;
    const bTiny = smallPerturbedB(b, tinyPert);
    const xTiny = luSolve(A, bTiny).x;
    const smallBChange = 100 * normInfVector(sub(bTiny, b)) / (normInfVector(b) || 1);
    const smallXChange = 100 * normInfVector(sub(xTiny, base)) / (normInfVector(base) || 1);
    const sensitivity = smallXChange / (smallBChange || 1);
    const cond = conditionNumber(A);

    renderCompareTable(base, crisis);
    renderRumorChart(base, crisis);
    renderResult(base, crisis, sensitivity, cond, scenarios[$("scenario").value].text, smallBChange, smallXChange);

    const iterative = $("solver").value !== "lu";
    $("iterPanel").classList.toggle("d-none", !iterative);
    $("errorPanel").classList.toggle("d-none", !iterative);
    if (iterative) {
      renderIterTable(crisisResult.rows);
      renderErrorChart(crisisResult.rows);
    }
    $("algorithmText").innerHTML = methodText[$("solver").value] + `<p class="mb-0">Además se calcula una perturbación de b y un número de condición aproximado con norma infinito. Esto permite responder si el sistema es estable o sensible a pequeños cambios.</p>`;
    $("message").innerHTML = `<div class="success-box">Análisis completado. Revisa condición, sensibilidad, tabla y gráfico.</div>`;
  } catch (e) {
    $("message").innerHTML = `<div class="error-box">${e.message}</div>`;
  }
}

function applyScenario() {
  const s = scenarios[$("scenario").value];
  $("demandRise").value = s.demand;
  $("routeLoss").value = s.routes;
}

function updateMethodUI() {
  const method = $("solver").value;
  const iterative = method !== "lu";
  $("iterControls").classList.toggle("d-none", !iterative);
  $("omegaBox").classList.toggle("d-none", method !== "sor");
  $("iterPanel").classList.toggle("d-none", true);
  $("errorPanel").classList.toggle("d-none", true);
  $("algorithmText").innerHTML = methodText[method];
  if (errorChart) errorChart.destroy();
}

function fmt(v) { return Number(v).toLocaleString("es-BO", { maximumFractionDigits: 4 }); }
function sci(v) { return Number(v).toExponential(3); }

$("size").addEventListener("change", () => renderMatrix(true));
$("loadExample").addEventListener("click", () => renderMatrix(true));
$("scenario").addEventListener("change", applyScenario);
$("solver").addEventListener("change", updateMethodUI);
$("analyzeBtn").addEventListener("click", analyze);

renderMatrix(true);
applyScenario();
updateMethodUI();
analyze();
