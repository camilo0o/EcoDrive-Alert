import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Mapa de avistamientos",
    description: "Consulta reportes recientes y ubica los puntos de riesgo en las rutas.",
    icon: "⌖",
  },
  {
    number: "02",
    title: "Reportes manuales",
    description: "Comparte un avistamiento para que otros conductores puedan prevenirse.",
    icon: "＋",
  },
  {
    number: "03",
    title: "Fauna de Uruguay",
    description: "Explora especies, niveles de riesgo y rutas disponibles.",
    icon: "✳",
  },
];

export default function Home() {
  return (
    <main className="landing">
      <header className="landing-header">
        <Link aria-label="Fauna en Ruta, inicio" className="brand" href="/">
          <span aria-hidden="true" className="brand-mark">F</span>
          <span>Fauna <span className="brand-light">en Ruta</span></span>
        </Link>
        <nav aria-label="Navegación principal" className="landing-nav">
          <Link className="text-link" href="/login">Iniciar sesión</Link>
          <Link className="button button-dark button-small" href="/register">Crear cuenta</Link>
        </nav>
      </header>

      <section aria-labelledby="hero-title" className="landing-hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="status-dot" /> Cuidamos a quienes comparten la ruta</span>
          <h1 id="hero-title">Fauna en Ruta</h1>
          <p className="hero-lead">
            Detección, reporte y prevención de fauna silvestre en las rutas de Uruguay.
          </p>
          <p className="hero-description">
            Una comunidad que comparte avistamientos para ayudar a que cada viaje sea más seguro
            para las personas y los animales.
          </p>
          <div className="hero-actions">
            <Link className="button button-dark" href="/register">Comenzar ahora <span aria-hidden="true">→</span></Link>
            <Link className="button button-light" href="/login">Ya tengo una cuenta</Link>
          </div>
          <div className="hero-note">
            <span aria-hidden="true" className="note-icon">✓</span>
            Reportes comunitarios para viajar con más información.
          </div>
        </div>

        <div aria-label="Vista ilustrativa de un mapa con avistamientos en Uruguay" className="hero-map">
          <div className="map-topline">
            <span><span className="status-dot" /> Actividad en las rutas</span>
            <span className="map-live">MAPA DE URUGUAY</span>
          </div>
          <div aria-hidden="true" className="map-art">
            <svg className="map-roads" viewBox="0 0 540 390" preserveAspectRatio="none">
              <path className="map-road road-main" d="M56 324 C120 290 145 252 195 237 S270 183 308 163 S388 126 486 51" />
              <path className="map-road" d="M90 28 C132 104 175 152 195 237 S245 331 278 370" />
              <path className="map-road" d="M30 198 C138 188 214 197 308 163 S421 177 520 227" />
              <path className="map-road" d="M262 28 C255 84 272 126 308 163 S370 235 416 353" />
              <path className="map-river" d="M35 116 C116 129 163 103 220 124 S341 93 505 119" />
            </svg>
            <span className="map-place place-one">Salto</span>
            <span className="map-place place-two">Durazno</span>
            <span className="map-place place-three">Montevideo</span>
            <span className="map-place place-four">Rocha</span>
            <span className="map-pin pin-one"><span>!</span></span>
            <span className="map-pin pin-two"><span>!</span></span>
            <span className="map-pin pin-three"><span>!</span></span>
            <span className="map-pin pin-four"><span>!</span></span>
            <span className="map-user-pin">●</span>
          </div>
          <div className="map-caption">
            <span><span className="legend-dot legend-warning" /> Avistamientos reportados</span>
            <span><span className="legend-dot legend-route" /> Rutas principales</span>
          </div>
          <div className="map-callout">
            <span aria-hidden="true" className="callout-icon">!</span>
            <span><strong>Conduce con precaución</strong><small>Hay fauna cerca de tu ruta</small></span>
            <span aria-hidden="true" className="callout-arrow">↗</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="features-title" className="feature-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Viajes más seguros, entre todos</span>
            <h2 id="features-title">Información que te acompaña en el camino</h2>
          </div>
          <p>Reporta, consulta y mantente atento a la fauna silvestre.</p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.number}>
              <div className="feature-card-top">
                <span aria-hidden="true" className="feature-icon">{feature.icon}</span>
                <span className="feature-number">{feature.number}</span>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <span>Fauna en Ruta <span className="footer-separator">·</span> Uruguay</span>
        <Link className="text-link" href="/login">Ingresar a mi cuenta <span aria-hidden="true">→</span></Link>
      </footer>
    </main>
  );
}
