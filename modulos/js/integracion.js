// Módulo 4: integración numérica del gasto familiar acumulado.
// math.js solamente evalúa la función escrita por el usuario; los métodos son propios.

const $ = (id) => document.getElementById(id);
let intChart = null;

const descriptions = {
  trap: `<p><strong>Trapecio compuesto.</strong> Divide el intervalo en subintervalos y aproxima el área usando trapecios. Es flexible y funciona con cualquier n positivo, pero puede ser menos preciso si la curva es muy curvada.</p>`,
  simpson13: `<p><strong>Simpson 1/3 compuesto.</strong> Usa parábolas para aproximar la curva. Requiere un número par de subintervalos y suele mejorar al trapecio en funciones suaves.</p>`,
  simpson38: `<p><strong>Simpson 3/8 compuesto.</strong> Usa polinomios cúbicos en grupos de tres subintervalos. Requiere que n sea múltiplo de 3.</p>`
};

function fFactory(expr) {
  let compiled;
  try { compiled = math.compile(expr); } catch { throw new Error("La función no pudo interpretarse. Usa sintaxis como: 8 + 0.35*x + 0.02*x^2"); }
  return (x) => {
    const y = compiled.evaluate({ x });
    if (!Number.isFinite(y)) throw new Error(`La función no es finita en x=${x}.`);
    return y;
  };
}

function validateInput() {
  const f = fFactory($("func").value.trim());
  const a = Number($("a").value), b = Number($("b").value), n = Math.floor(Number($("n").value));
  if (!Number.isFinite(a) || !Number.isFinite(b) || !(a < b)) throw new Error("Se requiere a < b con límites numéricos válidos.");
  if (!Number.isInteger(n) || n <= 0) throw new Error("El número de subintervalos n debe ser entero positivo.");
  return { f, a, b, n };
}

function sampleValues(f, a, b, n) {
  const h = (b - a) / n;
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = a + i * h;
    return { i, x, fx: f(x) };
  });
}

function trapecio(f, a, b, n) {
  const h = (b - a) / n;
  let sum = (f(a) + f(b)) / 2;
  for (let i = 1; i < n; i++) sum += f(a + i * h);
  return h * sum;
}

function simpson13(f, a, b, n) {
  if (n % 2 !== 0) throw new Error("Simpson 1/3 compuesto requiere n par. Si n es impar, aumenta o reduce n en una unidad.");
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) sum += (i % 2 === 0 ? 2 : 4) * f(a + i * h);
  return h * sum / 3;
}

function simpson38(f, a, b, n) {
  if (n % 3 !== 0) throw new Error("Simpson 3/8 compuesto requiere que n sea múltiplo de 3; con n impar no múltiplo de 3 el método no aplica.");
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) sum += (i % 3 === 0 ? 2 : 3) * f(a + i * h);
  return 3 * h * sum / 8;
}

function integrate(method, f, a, b, n) {
  if (method === "trap") return trapecio(f, a, b, n);
  if (method === "simpson13") return simpson13(f, a, b, n);
  return simpson38(f, a, b, n);
}

function renderValuesTable(values) {
  let html = `<thead><tr><th>i</th><th>xᵢ</th><th>f(xᵢ)</th></tr></thead><tbody>`;
  values.forEach(v => html += `<tr><td>${v.i}</td><td>${fmt(v.x)}</td><td>${fmt(v.fx)}</td></tr>`);
  $("valuesTable").innerHTML = html + `</tbody>`;
}

function renderCompare(f, a, b, n) {
  const methods = [
    ["trap", "Trapecio"],
    ["simpson13", "Simpson 1/3"],
    ["simpson38", "Simpson 3/8"]
  ];
  let html = `<thead><tr><th>Método</th><th>Resultado</th><th>Estado</th></tr></thead><tbody>`;
  methods.forEach(([key, name]) => {
    try {
      const value = integrate(key, f, a, b, n);
      html += `<tr><td>${name}</td><td>${fmt(value)} Bs</td><td>Válido</td></tr>`;
    } catch (e) {
      html += `<tr><td>${name}</td><td>—</td><td>${e.message}</td></tr>`;
    }
  });
  $("compareTable").innerHTML = html + `</tbody>`;
}

function renderChart(f, a, b) {
  const curve = [];
  const baseline = [];
  for (let i = 0; i <= 160; i++) {
    const x = a + (b - a) * i / 160;
    const y = f(x);
    curve.push({ x, y });
    baseline.push({ x, y: 0 });
  }
  if (intChart) intChart.destroy();
  intChart = new Chart($("intChart"), {
    type: "line",
    data: {
      datasets: [
        { label: "Precio diario", data: curve, parsing: false, pointRadius: 0, tension: 0.25, fill: "origin" }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: "linear", title: { display: true, text: "Día" } }, y: { title: { display: true, text: "Precio (Bs)" }, beginAtZero: true } } }
  });
}

function methodName(key) {
  return { trap: "Regla del Trapecio Compuesta", simpson13: "Simpson 1/3 Compuesto", simpson38: "Simpson 3/8 Compuesto" }[key];
}

function run() {
  try {
    $("message").innerHTML = "";
    const { f, a, b, n } = validateInput();
    const method = $("method").value;
    const result = integrate(method, f, a, b, n);
    const values = sampleValues(f, a, b, n);
    renderValuesTable(values);
    renderCompare(f, a, b, n);
    renderChart(f, a, b);
    const noInflation = f(a) * (b - a);
    const difference = result - noInflation;
    $("result").innerHTML = `<p class="mb-2"><strong>${methodName(method)}:</strong> área bajo la curva = <strong>${fmt(result)} Bs</strong>.</p>
      <p class="mb-2"><strong>Escenario sin inflación aproximado:</strong> ${fmt(noInflation)} Bs usando el precio inicial constante.</p>
      <p class="mb-0">Interpretación: la diferencia estimada es <strong>${fmt(difference)} Bs</strong>. Si es positiva, representa gasto adicional por incremento de precios durante el periodo.</p>`;
    $("algorithmText").innerHTML = descriptions[method] + `<p class="mb-0">El área bajo f(x) aproxima el gasto acumulado porque f(x) representa el precio diario de la canasta básica.</p>`;
    $("message").innerHTML = `<div class="success-box">Integración completada. También se compararon automáticamente los tres métodos.</div>`;
  } catch (e) {
    $("message").innerHTML = `<div class="error-box">${e.message}</div>`;
  }
}

function fmt(v) { return Number(v).toLocaleString("es-BO", { maximumFractionDigits: 4 }); }

$("integrateBtn").addEventListener("click", run);
$("method").addEventListener("change", () => { $("algorithmText").innerHTML = descriptions[$("method").value]; });
run();
