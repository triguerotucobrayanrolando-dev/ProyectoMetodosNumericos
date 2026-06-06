// Módulo 2: raíces de ecuaciones para puntos críticos.
// math.js se usa solamente para evaluar funciones ingresadas por el usuario.

const $ = (id) => document.getElementById(id);
let rootChart = null;

const descriptions = {
  bisection: `<p><strong>Bisección.</strong> Requiere un intervalo [a,b] con cambio de signo. En cada iteración divide el intervalo a la mitad y conserva el subintervalo donde la función cambia de signo. Es lento pero muy robusto.</p>`,
  newton: `<p><strong>Newton-Raphson.</strong> Usa la recta tangente para aproximar la raíz: x(n+1)=x(n)-f(x)/f'(x). En esta app la derivada se aproxima con diferencia central. Converge rápido si el punto inicial es bueno.</p>`,
  secant: `<p><strong>Secante.</strong> Evita calcular derivadas usando dos puntos iniciales. Aproxima la pendiente con una recta secante y suele converger más rápido que bisección, aunque es menos garantizado.</p>`
};

function renderParams() {
  const m = $("method").value;
  let html = "";
  if (m === "bisection") {
    html = `<div class="col-6"><label class="form-label" for="a">a</label><input id="a" type="number" class="form-control" value="0" step="0.1"></div>
            <div class="col-6"><label class="form-label" for="b">b</label><input id="b" type="number" class="form-control" value="30" step="0.1"></div>`;
  } else if (m === "newton") {
    html = `<div class="col-12"><label class="form-label" for="x0">Punto inicial x₀</label><input id="x0" type="number" class="form-control" value="20" step="0.1"></div>`;
  } else {
    html = `<div class="col-6"><label class="form-label" for="x0">x₀</label><input id="x0" type="number" class="form-control" value="10" step="0.1"></div>
            <div class="col-6"><label class="form-label" for="x1">x₁</label><input id="x1" type="number" class="form-control" value="30" step="0.1"></div>`;
  }
  $("paramBox").innerHTML = html;
  $("algorithmText").innerHTML = descriptions[m] + `<p class="mb-0">En contexto, la raíz representa el día, nivel de demanda o umbral donde el saldo del modelo cambia de signo.</p>`;
}

function fFactory(expr) {
  let compiled;
  try { compiled = math.compile(expr); } catch (e) { throw new Error("La función no pudo interpretarse. Revisa la sintaxis, por ejemplo: 0.8*x^2 + 12*x - 420"); }
  return (x) => {
    const y = compiled.evaluate({ x });
    if (!Number.isFinite(y)) throw new Error(`La función no es finita en x=${x}.`);
    return y;
  };
}

function derivative(f, x) {
  const h = Math.max(1e-6, Math.abs(x) * 1e-6);
  return (f(x + h) - f(x - h)) / (2 * h);
}

function bisection(f, a, b, tol, maxIter) {
  let fa = f(a), fb = f(b);
  if (fa * fb > 0) throw new Error("Bisección requiere cambio de signo en el intervalo [a,b]. Ajusta el intervalo.");
  const rows = [];
  let mid = a;
  let err = Math.abs(b - a);
  for (let n = 1; n <= maxIter; n++) {
    mid = (a + b) / 2;
    const fm = f(mid);
    err = Math.abs(b - a) / 2;
    rows.push({ n, x: mid, fx: fm, err });
    if (Math.abs(fm) < tol || err < tol) break;
    if (fa * fm < 0) { b = mid; fb = fm; }
    else { a = mid; fa = fm; }
  }
  return { root: mid, rows, err };
}

function newton(f, x0, tol, maxIter) {
  const rows = [];
  let x = x0;
  for (let n = 1; n <= maxIter; n++) {
    const fx = f(x);
    const dfx = derivative(f, x);
    if (Math.abs(dfx) < 1e-12) throw new Error("Newton-Raphson se detuvo porque la derivada es casi cero.");
    const nx = x - fx / dfx;
    const err = Math.abs(nx - x);
    rows.push({ n, x: nx, fx: f(nx), err });
    x = nx;
    if (err < tol || Math.abs(f(x)) < tol) break;
  }
  return { root: x, rows, err: rows.at(-1)?.err ?? 0 };
}

function secant(f, x0, x1, tol, maxIter) {
  const rows = [];
  let prev = x0, curr = x1;
  for (let n = 1; n <= maxIter; n++) {
    const f0 = f(prev), f1 = f(curr);
    const denom = f1 - f0;
    if (Math.abs(denom) < 1e-14) throw new Error("Secante se detuvo porque dos evaluaciones son casi iguales.");
    const next = curr - f1 * (curr - prev) / denom;
    const err = Math.abs(next - curr);
    rows.push({ n, x: next, fx: f(next), err });
    prev = curr; curr = next;
    if (err < tol || Math.abs(f(curr)) < tol) break;
  }
  return { root: curr, rows, err: rows.at(-1)?.err ?? 0 };
}

function convergenceOrder(rows) {
  const e = rows.map(r => r.err).filter(v => v > 0 && Number.isFinite(v));
  if (e.length < 3) return null;
  const e0 = e[e.length - 3], e1 = e[e.length - 2], e2 = e[e.length - 1];
  const denom = Math.log(e1 / e0);
  if (Math.abs(denom) < 1e-12) return null;
  const p = Math.log(e2 / e1) / denom;
  return Number.isFinite(p) ? p : null;
}

function renderTable(rows) {
  let html = `<thead><tr><th>n</th><th>xₙ</th><th>f(xₙ)</th><th>Error absoluto</th></tr></thead><tbody>`;
  rows.forEach(r => html += `<tr><td>${r.n}</td><td>${fmt(r.x)}</td><td>${fmtSci(r.fx)}</td><td>${fmtSci(r.err)}</td></tr>`);
  html += `</tbody>`;
  $("iterTable").innerHTML = html;
}

function graphFunction(f, root, domain) {
  const [minX, maxX] = domain;
  const xs = [];
  const ys = [];
  const steps = 180;
  for (let i = 0; i <= steps; i++) {
    const x = minX + (maxX - minX) * i / steps;
    xs.push(x);
    try { ys.push(f(x)); } catch { ys.push(null); }
  }
  if (rootChart) rootChart.destroy();
  rootChart = new Chart($("rootChart"), {
    type: "line",
    data: {
      labels: xs.map(x => fmt(x)),
      datasets: [
        { label: "f(x)", data: ys, pointRadius: 0, tension: 0.25 },
        { label: "Raíz", data: xs.map(x => Math.abs(x - root) < (maxX - minX) / steps ? 0 : null), pointRadius: 6, showLine: false, borderColor: "red", backgroundColor: "red" }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: "x" } }, y: { title: { display: true, text: "f(x)" } } } }
  });
}

function solve() {
  try {
    $("message").innerHTML = "";
    const expr = $("func").value.trim();
    const f = fFactory(expr);
    const tol = Number($("tol").value);
    const maxIter = Number($("maxIter").value);
    if (!(tol > 0) || !(maxIter > 0)) throw new Error("La tolerancia y el máximo de iteraciones deben ser positivos.");
    const m = $("method").value;
    let out, domain;
    if (m === "bisection") {
      const a = Number($("a").value), b = Number($("b").value);
      if (!(a < b)) throw new Error("En bisección se requiere a < b.");
      out = bisection(f, a, b, tol, maxIter);
      domain = [a, b];
    } else if (m === "newton") {
      const x0 = Number($("x0").value);
      out = newton(f, x0, tol, maxIter);
      domain = [x0 - 10, x0 + 10];
    } else {
      const x0 = Number($("x0").value), x1 = Number($("x1").value);
      if (x0 === x1) throw new Error("La secante necesita dos puntos iniciales distintos.");
      out = secant(f, x0, x1, tol, maxIter);
      domain = [Math.min(x0, x1) - 5, Math.max(x0, x1) + 5];
    }
    const p = convergenceOrder(out.rows);
    renderTable(out.rows);
    graphFunction(f, out.root, domain);
    $("result").innerHTML = `<p class="mb-2"><strong>Raíz encontrada:</strong> ${fmt(out.root)}</p>
      <p class="mb-2"><strong>Iteraciones usadas:</strong> ${out.rows.length}. <strong>Error final:</strong> ${fmtSci(out.err)}.</p>
      <p class="mb-2"><strong>Orden de convergencia estimado:</strong> ${p ? fmt(p) : "no disponible con las iteraciones actuales"}.</p>
      <p class="mb-0">Interpretación: en este punto crítico la función cambia de signo. Si f(x) representa gasto menos ingreso, desde ese umbral el gasto familiar iguala o supera el ingreso disponible. Si representa consumo menos reposición, la planta llega al equilibrio entre salida y entrada.</p>`;
    $("message").innerHTML = `<div class="success-box">Cálculo completado. La raíz está marcada en rojo sobre el gráfico.</div>`;
  } catch (e) {
    $("message").innerHTML = `<div class="error-box">${e.message}</div>`;
  }
}

function fmt(v) { return Number(v).toLocaleString("es-BO", { maximumFractionDigits: 6 }); }
function fmtSci(v) { return Number(v).toExponential(4); }

$("method").addEventListener("change", renderParams);
$("solveBtn").addEventListener("click", solve);
renderParams();
solve();
