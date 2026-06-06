# CrisisNum — Simulador de Crisis Bolivia

Aplicación web educativa desarrollada con HTML5, CSS3, JavaScript ES6+, Bootstrap 5, Chart.js y math.js. Modela una crisis de abastecimiento y conflicto social en Bolivia mediante métodos numéricos aplicados a distribución de combustible, puntos críticos, evolución de precios, gasto familiar acumulado, reservas de una planta distribuidora, rumores de desabastecimiento y difusión de opinión social.

## Módulos y métodos

| Módulo | Escenario | Métodos implementados |
|---|---|---|
| 1 | Distribución y abastecimiento | LU con pivoteo parcial, Jacobi, Gauss-Seidel, SOR y Gradiente Conjugado |
| 2 | Puntos críticos de reserva | Bisección, Newton-Raphson y Secante |
| 3 | Evolución de precios | Lagrange, Newton por diferencias divididas y Splines Cúbicos Naturales |
| 4 | Gasto familiar acumulado | Trapecio compuesto, Simpson 1/3 compuesto y Simpson 3/8 compuesto |
| 5 | Reservas de combustible | Euler explícito, Heun y Runge-Kutta de cuarto orden |
| 6 | Rumores de desabastecimiento y pánico de compra | Sistemas lineales, LU, Jacobi, Gauss-Seidel, SOR, Gradiente Conjugado, número de condición y perturbación |
| 7 | Difusión de opinión o descontento social | Euler explícito, Heun y RK4 para el sistema N(t), M(t), D(t) |

## Cómo abrir localmente

No requiere servidor ni instalación. Basta con abrir el archivo `index.html` en el navegador. También puede ejecutarse con una extensión tipo Live Server, pero no es obligatorio.

## Publicación

- URL de GitHub Pages: pendiente
- Repositorio Git: pendiente

## Estructura

```text
crisisnum/
├── index.html
├── README.md
├── assets/
│   └── css/
│       └── main.css
└── modulos/
    ├── sistemas.html
    ├── raices.html
    ├── interpolacion.html
    ├── integracion.html
    ├── edo.html
    ├── rumores.html
    ├── difusion.html
    └── js/
        ├── sistemas.js
        ├── raices.js
        ├── interpolacion.js
        ├── integracion.js
        ├── edo.js
        ├── rumores.js
        └── difusion.js
```

## Autor, materia y universidad

- Autor: pendiente de completar
- Materia: Métodos Numéricos
- Universidad: pendiente de completar

## Notas académicas

Los algoritmos numéricos fueron implementados desde cero en JavaScript. La librería `math.js` se usa únicamente para evaluar funciones escritas por el usuario en los módulos de raíces e integración. Los resultados se muestran en el DOM mediante tablas, gráficos e interpretaciones, nunca solo en consola.
