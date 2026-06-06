// Módulo 3: interpolación para reconstruir precios incompletos.
// Los métodos se implementan manualmente: Lagrange, Newton y splines naturales.

const $ = (id) => document.getElementById(id);
let chart = null;
const defaultPoints = [
  { x: 1, y: 8 }, { x: 5, y: 10 }, { x: 10, y: 13 },
  { x: 15, y: 16 }, { x: 20, y: 19 }, { x: 30, y: 22 }
];

const descriptions = {
  lagrange: `<p><strong>Lagrange.</strong> Construye un polinomio global como combinación de bases Lᵢ(x). Cada base vale 1 en su punto y 0 en los demás. Es directo, pero puede oscilar si hay muchos puntos o datos muy dispersos.</p>`,
  newton: `<p><strong>Newton por diferencias divididas.</strong> Construye el polinomio incrementalmente con coeficientes obtenidos en una tabla triangular. Es más práctico para agregar puntos que Lagrange.</p>`,
  spline: `<p><strong>Spline cúbico natural.</strong> Une cada par de puntos con un polinomio cúbico y exige suavidad en las derivadas. La condición natural fija segunda derivada cero en los extremos para evitar curvaturas artificiales.</p>`
};

function setDefaultRows() {
  const tbody = $("pointsTable").querySelector("tbody");
  tbody.innerHTML = "";
  defaultPoints.forEach(p => addRow(p.x, p.y));
}

function addRow(x = "", y = "") {
  const tbody = $("pointsTable").querySelector("tbody");
  const tr = document.createElement("tr");
  tr.className = "point-row";
  tr.innerHTML = `<td><input type="number" class="form-control form-control-sm px" value="${x}" step="0.1"></td>
                  <td><input type="number" class="form-control form-control-sm py" value="${y}" step="0.1"></td>
                  <td><button class="btn btn-sm btn-outline-danger" type="button">Eliminar</button></td>`;
  tr.querySelector("button").addEventListener("click", () => { tr.remove(); runInterpolation(false); });
  tbody.appendChild(tr);
}

function readPoints() {
  const rows = Array.from(document.querySelectorAll(".point-row"));
  const pts = rows.map(row => ({
    x: Number(row.querySelector(".px").value),
    y: Number(row.querySelector(".py").value)
  }));
  if (pts.length < 2) throw new Error("Datos insuficientes para interpolar: se necesitan al menos dos puntos.");
  if (pts.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw new Error("Existen datos vacíos o no numéricos.");
  pts.sort((a, b) => a.x - b.x);
  for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i].x - pts[i - 1].x) < 1e-12) throw new Error("No puede haber días repetidos en la tabla.");
  return pts;
}

function lagrangeEvaluator(points) {
  return (x) => points.reduce((sum, pi, i) => {
    let Li = 1;
    points.forEach((pj, j) => { if (i !== j) Li *= (x - pj.x) / (pi.x - pj.x); });
    return sum + pi.y * Li;
  }, 0);
}

function lagrangeCoefTable(points) {
  let html = `<thead><tr><th>i</th><th>xᵢ</th><th>yᵢ</th><th>Denominador Π(xᵢ-xⱼ)</th><th>Factor yᵢ/den.</th></tr></thead><tbody>`;
  points.forEach((pi, i) => {
    let den = 1;
    points.forEach((pj, j) => { if (i !== j) den *= (pi.x - pj.x); });
    html += `<tr><td>${i}</td><td>${fmt(pi.x)}</td><td>${fmt(pi.y)}</td><td>${fmt(den)}</td><td>${fmt(pi.y / den)}</td></tr>`;
  });
  return html + `</tbody>`;
}

function newtonDivided(points) {
  const n = points.length;
  const table = Array.from({ length: n }, () => Array(n).fill(null));
  for (let i = 0; i < n; i++) table[i][0] = points[i].y;
  for (let j = 1; j < n; j++) {
    for (let i = 0; i < n - j; i++) {
      table[i][j] = (table[i + 1][j - 1] - table[i][j - 1]) / (points[i + j].x - points[i].x);
    }
  }
  const coefs = table[0].slice();
  const evalN = (x) => {
    let value = coefs[n - 1];
    for (let k = n - 2; k >= 0; k--) value = value * (x - points[k].x) + coefs[k];
    return value;
  };
  return { table, coefs, evalN };
}

function newtonCoefTable(points, data) {
  let html = `<thead><tr><th>i</th><th>xᵢ</th>`;
  for (let j = 0; j < points.length; j++) html += `<th>Orden ${j}</th>`;
  html += `</tr></thead><tbody>`;
  for (let i = 0; i < points.length; i++) {
    html += `<tr><td>${i}</td><td>${fmt(points[i].x)}</td>`;
    for (let j = 0; j < points.length; j++) html += `<td>${data.table[i][j] === null ? "" : fmt(data.table[i][j])}</td>`;
    html += `</tr>`;
  }
  html += `</tbody>`;
  return html;
}

function splineNatural(points) {
  const n = points.length - 1;
  if (n < 2) throw new Error("Para splines cúbicos se necesitan al menos tres puntos.");
  const a = points.map(p => p.y);
  const h = Array(n).fill(0).map((_, i) => points[i + 1].x - points[i].x);
  const alpha = Array(n).fill(0);
  for (let i = 1; i < n; i++) alpha[i] = (3 / h[i]) * (a[i + 1] - a[i]) - (3 / h[i - 1]) * (a[i] - a[i - 1]);

  // Algoritmo tridiagonal para spline natural.
  const l = Array(n + 1).fill(0), mu = Array(n + 1).fill(0), z = Array(n + 1).fill(0);
  l[0] = 1; mu[0] = 0; z[0] = 0;
  for (let i = 1; i < n; i++) {
    l[i] = 2 * (points[i + 1].x - points[i - 1].x) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / l[i];
    z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
  }
  l[n] = 1; z[n] = 0;
  const c = Array(n + 1).fill(0), b = Array(n).fill(0), d = Array(n).fill(0);
  for (let j = n - 1; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (a[j + 1] - a[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }
  const evalS = (x) => {
    let i = n - 1;
    if (x <= points[0].x) i = 0;
    else if (x >= points[n].x) i = n - 1;
    else for (let k = 0; k < n; k++) if (x >= points[k].x && x <= points[k + 1].x) { i = k; break; }
    const dx = x - points[i].x;
    return a[i] + b[i] * dx + c[i] * dx * dx + d[i] * dx * dx * dx;
  };
  return { a, b, c, d, evalS };
}

function splineCoefTable(points, s) {
  let html = `<thead><tr><th>Intervalo</th><th>a</th><th>b</th><th>c</th><th>d</th></tr></thead><tbody>`;
  for (let i = 0; i < points.length - 1; i++) {
    html += `<tr><td>[${fmt(points[i].x)}, ${fmt(points[i + 1].x)}]</td><td>${fmt(s.a[i])}</td><td>${fmt(s.b[i])}</td><td>${fmt(s.c[i])}</td><td>${fmt(s.d[i])}</td></tr>`;
  }
  return html + `</tbody>`;
}

function getEvaluator(points, method) {
  if (method === "lagrange") return { eval: lagrangeEvaluator(points), table: lagrangeCoefTable(points) };
  if (method === "newton") {
    const data = newtonDivided(points);
    return { eval: data.evalN, table: newtonCoefTable(points, data) };
  }
  const s = splineNatural(points);
  return { eval: s.evalS, table: splineCoefTable(points, s) };
}

function renderChart(points, evaluator, queryX, queryY) {
  const minX = points[0].x, maxX = points[points.length - 1].x;
  const curve = [];
  for (let i = 0; i < 100; i++) {
    const x = minX + (maxX - minX) * i / 99;
    curve.push({ x, y: evaluator(x) });
  }
  if (chart) chart.destroy();
  chart = new Chart($("interpChart"), {
    type: "scatter",
    data: {
      datasets: [
        { type: "line", label: "Curva interpolada", data: curve, pointRadius: 0, tension: 0.25 },
        { label: "Datos originales", data: points, pointRadius: 5 },
        { label: "Estimación", data: [{ x: queryX, y: queryY }], pointRadius: 7, backgroundColor: "red", borderColor: "red" }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, parsing: false, scales: { x: { type: "linear", title: { display: true, text: "Día" } }, y: { title: { display: true, text: "Precio (Bs)" } } } }
  });
}

function runInterpolation(showEstimate = true) {
  try {
    $("message").innerHTML = "";
    const points = readPoints();
    const method = $("method").value;
    const queryX = Number($("queryX").value);
    if (!Number.isFinite(queryX)) throw new Error("El día a consultar no es válido.");
    const obj = getEvaluator(points, method);
    const queryY = obj.eval(queryX);
    $("coefTable").innerHTML = obj.table;
    renderChart(points, obj.eval, queryX, queryY);
    $("algorithmText").innerHTML = descriptions[method] + `<p class="mb-0">La interpolación es confiable principalmente dentro del rango observado (${fmt(points[0].x)} a ${fmt(points.at(-1).x)} días). Fuera de ese dominio se considera extrapolación y aumenta el riesgo de error.</p>`;
    if (showEstimate) {
      const warning = (queryX < points[0].x || queryX > points.at(-1).x) ? " Esta consulta está fuera del dominio de datos, por lo que es extrapolación." : "";
      $("result").innerHTML = `<p class="mb-2"><strong>El día ${fmt(queryX)} el precio sería aproximadamente ${fmt(queryY)} Bs.</strong></p><p class="mb-0">Interpretación: el valor estimado ayuda a completar días sin registro y visualizar la tendencia del alimento. ${warning}</p>`;
    }
  } catch (e) {
    $("message").innerHTML = `<div class="error-box">${e.message}</div>`;
  }
}

function fmt(v) { return Number(v).toLocaleString("es-BO", { maximumFractionDigits: 4 }); }

$("addPoint").addEventListener("click", () => addRow());
$("resetPoints").addEventListener("click", () => { setDefaultRows(); runInterpolation(false); });
$("estimateBtn").addEventListener("click", () => runInterpolation(true));
$("method").addEventListener("change", () => runInterpolation(false));

setDefaultRows();
runInterpolation(false);
