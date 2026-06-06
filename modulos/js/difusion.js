// Módulo 7: Difusión de opinión o descontento social.
// Modelo académico sin postura política:
// N'(t) = -a N M + b D
// M'(t) =  a N M - c M D
// D'(t) =  k M   - r D

const $ = (id) => document.getElementById(id);
let socialChart = null;

const methodDescriptions = {
  euler: `<p><strong>Euler explícito.</strong> Avanza usando la pendiente al inicio de cada intervalo. Es fácil de entender, pero puede acumular error y generar valores menos estables si h es grande.</p>`,
  heun: `<p><strong>Heun.</strong> Primero predice con Euler y luego corrige con el promedio de la pendiente inicial y final. Mejora la estabilidad respecto a Euler.</p>`,
  rk4: `<p><strong>Runge-Kutta de cuarto orden.</strong> Usa cuatro pendientes dentro del paso. Es el método más estable de este módulo para comparar escenarios de dinámica social suave.</p>`
};

function readParams() {
  const p = {
    N0: Number($("n0").value),
    M0: Number($("m0").value),
    D0: Number($("d0").value),
    a: Number($("a").value),
    b: Number($("b").value),
    c: Number($("c").value),
    k: Number($("k").value),
    r: Number($("r").value),
    days: Number($("days").value),
    h: Number($("h").value),
    criticalM: Number($("criticalM").value)
  };
  if (Object.values(p).some(v => !Number.isFinite(v))) throw new Error("Todos los parámetros deben ser numéricos.");
  if (p.N0 < 0 || p.M0 < 0 || p.D0 < 0) throw new Error("N₀, M₀ y D₀ no pueden ser negativos.");
  if (p.a < 0 || p.b < 0 || p.c < 0 || p.k < 0 || p.r < 0) throw new Error("Las tasas del modelo no pueden ser negativas.");
  if (p.days <= 0 || p.h <= 0) throw new Error("Días y paso h deben ser mayores que cero.");
  if (p.criticalM < 0) throw new Error("El umbral crítico de M debe ser no negativo.");
  return p;
}

function derivatives(state, p) {
  const { N, M, D } = state;
  return {
    N: -p.a * N * M + p.b * D,
    M: p.a * N * M - p.c * M * D,
    D: p.k * M - p.r * D
  };
}

function addState(s, k, factor) {
  return { N: s.N + factor * k.N, M: s.M + factor * k.M, D: s.D + factor * k.D };
}

function cleanState(s) {
  // Evita pequeñas cantidades negativas generadas por redondeo numérico.
  return { N: Math.max(0, s.N), M: Math.max(0, s.M), D: Math.max(0, s.D) };
}

function stepEuler(s, h, p) {
  const k1 = derivatives(s, p);
  return cleanState(addState(s, k1, h));
}

function stepHeun(s, h, p) {
  const k1 = derivatives(s, p);
  const pred = cleanState(addState(s, k1, h));
  const k2 = derivatives(pred, p);
  return cleanState({
    N: s.N + h * (k1.N + k2.N) / 2,
    M: s.M + h * (k1.M + k2.M) / 2,
    D: s.D + h * (k1.D + k2.D) / 2
  });
}

function stepRK4(s, h, p) {
  const k1 = derivatives(s, p);
  const k2 = derivatives(addState(s, k1, h / 2), p);
  const k3 = derivatives(addState(s, k2, h / 2), p);
  const k4 = derivatives(addState(s, k3, h), p);
  return cleanState({
    N: s.N + h * (k1.N + 2 * k2.N + 2 * k3.N + k4.N) / 6,
    M: s.M + h * (k1.M + 2 * k2.M + 2 * k3.M + k4.M) / 6,
    D: s.D + h * (k1.D + 2 * k2.D + 2 * k3.D + k4.D) / 6
  });
}

function simulate(method, p) {
  let t = 0;
  let state = { N: p.N0, M: p.M0, D: p.D0 };
  const rows = [{ t, ...state }];
  const steps = Math.ceil(p.days / p.h);
  for (let i = 0; i < steps; i++) {
    const hStep = Math.min(p.h, p.days - t);
    if (hStep <= 1e-12) break;
    if (method === "euler") state = stepEuler(state, hStep, p);
    else if (method === "heun") state = stepHeun(state, hStep, p);
    else state = stepRK4(state, hStep, p);
    t += hStep;
    rows.push({ t, ...state });
  }
  return rows;
}

function renderTable(rows) {
  let html = `<thead><tr><th>t</th><th>N(t) neutrales</th><th>M(t) manifestantes</th><th>D(t) mediadores</th></tr></thead><tbody>`;
  rows.forEach(row => html += `<tr><td>${fmt(row.t)}</td><td>${fmt(row.N)}</td><td>${fmt(row.M)}</td><td>${fmt(row.D)}</td></tr>`);
  $("valuesTable").innerHTML = html + `</tbody>`;
}

function datasetFor(rows, key, label, borderDash = []) {
  return {
    label,
    data: rows.map(r => ({ x: r.t, y: r[key] })),
    parsing: false,
    pointRadius: 1.5,
    tension: 0.22,
    borderDash
  };
}

function renderChart(series, p, compare = false) {
  if (socialChart) socialChart.destroy();
  const datasets = [];
  if (!compare) {
    datasets.push(datasetFor(series, "N", "N(t) neutrales"));
    datasets.push(datasetFor(series, "M", "M(t) manifestantes"));
    datasets.push(datasetFor(series, "D", "D(t) mediadores"));
  } else {
    datasets.push(datasetFor(series.euler, "M", "M(t) Euler"));
    datasets.push(datasetFor(series.heun, "M", "M(t) Heun", [6, 4]));
    datasets.push(datasetFor(series.rk4, "M", "M(t) RK4", [2, 3]));
  }
  datasets.push({
    label: "Umbral crítico de M",
    data: [{ x: 0, y: p.criticalM }, { x: p.days, y: p.criticalM }],
    parsing: false,
    pointRadius: 0,
    borderDash: [8, 6]
  });
  socialChart = new Chart($("socialChart"), {
    type: "line",
    data: { datasets },
    options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: "linear", title: { display: true, text: "Tiempo (días)" } }, y: { title: { display: true, text: "Proporción / índice" }, beginAtZero: true } } }
  });
}

function criticalDay(rows, threshold) {
  const hit = rows.find(r => r.M >= threshold);
  return hit ? hit.t : null;
}

function trend(rows) {
  const first = rows[0];
  const last = rows[rows.length - 1];
  const deltaM = last.M - first.M;
  const deltaD = last.D - first.D;
  if (deltaM > 0.05 && last.M > last.N) return "masificación del conflicto";
  if (deltaM < -0.03 || deltaD > deltaM) return "tendencia a estabilización o mediación";
  return "evolución intermedia, sensible a parámetros";
}

function renderResult(rows, p, method) {
  const last = rows[rows.length - 1];
  const maxM = rows.reduce((best, r) => r.M > best.M ? r : best, rows[0]);
  const hit = criticalDay(rows, p.criticalM);
  const box = hit !== null ? "error-box" : "success-box";
  $("result").innerHTML = `
    <p class="mb-2"><strong>Método:</strong> ${methodLabel(method)}.</p>
    <p class="mb-2"><strong>Estado final:</strong> N=${fmt(last.N)}, M=${fmt(last.M)}, D=${fmt(last.D)}.</p>
    <p class="mb-2"><strong>Máximo de M(t):</strong> ${fmt(maxM.M)} en el día ${fmt(maxM.t)}.</p>
    <div class="${box} mb-3">${hit !== null ? `⚠ El umbral crítico de manifestantes se alcanza el día ${fmt(hit)}.` : "No se alcanza el umbral crítico dentro del periodo simulado."}</div>
    <p class="mb-0">Interpretación académica: el sistema muestra <strong>${trend(rows)}</strong>. Aumentar c o k representa mayor capacidad de diálogo/mediación; aumentar a representa mayor contagio del descontento. El modelo es simplificado y no contiene valoración política.</p>`;
}

function runSingle() {
  try {
    $("message").innerHTML = "";
    const p = readParams();
    const method = $("method").value;
    const rows = simulate(method, p);
    renderTable(rows);
    renderChart(rows, p, false);
    renderResult(rows, p, method);
    $("algorithmText").innerHTML = methodDescriptions[method] + `<p class="mb-0">Las variables N, M y D representan proporciones o índices normalizados. El objetivo es comparar tendencias, no predecir cantidades reales exactas.</p>`;
    $("message").innerHTML = `<div class="success-box">Simulación completada.</div>`;
  } catch (e) {
    $("message").innerHTML = `<div class="error-box">${e.message}</div>`;
  }
}

function compareMethods() {
  try {
    $("message").innerHTML = "";
    const p = readParams();
    const series = {
      euler: simulate("euler", p),
      heun: simulate("heun", p),
      rk4: simulate("rk4", p)
    };
    const selected = $("method").value;
    renderTable(series[selected]);
    renderChart(series, p, true);
    renderResult(series[selected], p, selected);
    $("algorithmText").innerHTML = `<p><strong>Comparación de métodos.</strong> El gráfico muestra M(t) calculado con Euler, Heun y RK4. Si las curvas se separan mucho, el paso h es grande o el sistema es sensible; conviene reducir h y preferir RK4.</p>`;
    $("message").innerHTML = `<div class="success-box">Comparación generada con Euler, Heun y RK4.</div>`;
  } catch (e) {
    $("message").innerHTML = `<div class="error-box">${e.message}</div>`;
  }
}

function methodLabel(key) { return { euler: "Euler Explícito", heun: "Heun", rk4: "RK4" }[key]; }
function fmt(v) { return Number(v).toLocaleString("es-BO", { maximumFractionDigits: 4 }); }

$("simulateBtn").addEventListener("click", runSingle);
$("compareBtn").addEventListener("click", compareMethods);
$("method").addEventListener("change", () => { $("algorithmText").innerHTML = methodDescriptions[$("method").value]; });

runSingle();
