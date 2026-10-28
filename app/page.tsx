import Link from "next/link";
import { ArrowRight, Check, ClipboardPlus, MapPin, PawPrint } from "lucide-react";

const features = [
  {
    number: "01",
    title: "Mapa de avistamientos",
    description: "Consulta reportes recientes y ubica los puntos de riesgo en las rutas.",
    icon: MapPin,
    iconStyle: "bg-[#e4f0e9] text-[#20534a]",
  },
  {
    number: "02",
    title: "Reportes manuales",
    description: "Comparte un avistamiento para que otros conductores puedan prevenirse.",
    icon: ClipboardPlus,
    iconStyle: "bg-[#fae9e9] text-[#ad5361]",
  },
  {
    number: "03",
    title: "Fauna de Uruguay",
    description: "Explora especies, niveles de riesgo y rutas disponibles.",
    icon: PawPrint,
    iconStyle: "bg-[#f6f0df] text-[#947a43]",
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-[min(1200px,calc(100%-64px))] max-sm:w-[calc(100%-28px)]">
      <header className="flex min-h-[88px] items-center justify-between border-b border-[#20534a]/10 max-sm:min-h-[69px]">
        <Link aria-label="Fauna en Ruta, inicio" className="inline-flex items-center gap-[11px] text-[19px] font-extrabold tracking-[-.04em] text-[#173d36] max-sm:gap-2 max-sm:text-[17px]" href="/">
          <span aria-hidden="true" className="grid size-[35px] place-items-center rounded-[12px_12px_12px_4px] bg-[#20534a] text-xl text-white max-sm:size-[31px]">F</span>
          <span>Fauna <span className="font-medium">en Ruta</span></span>
        </Link>
        <nav aria-label="Navegación principal" className="flex items-center gap-[23px] max-sm:gap-2">
          <Link className="text-[13px] font-bold text-[#20534a] underline-offset-4 hover:text-[#287568] hover:underline max-sm:text-[10px]" href="/login">Iniciar sesión</Link>
          <Link className="inline-flex min-h-10 items-center justify-center rounded-[11px] bg-[#20534a] px-4 text-[13px] font-bold text-white transition hover:-translate-y-px hover:bg-[#173d36] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#287568] max-sm:min-h-9 max-sm:px-[11px] max-sm:text-[11px]" href="/register">Crear cuenta</Link>
        </nav>
      </header>

      <section aria-labelledby="hero-title" className="grid grid-cols-[.9fr_1.1fr] items-center gap-16 py-[71px] max-[850px]:grid-cols-2 max-[850px]:gap-[30px] max-[850px]:py-14 max-[760px]:grid-cols-1 max-[760px]:gap-[29px] max-[760px]:py-[43px]">
        <div className="py-[9px]">
          <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.11em] text-[#287568]">
            <span aria-hidden="true" className="size-2 rounded-full bg-[#64a885] shadow-[0_0_0_4px_rgba(100,168,133,.14)]" />
            Cuidamos a quienes comparten la ruta
          </span>
          <h1 className="my-5 text-[clamp(48px,6vw,76px)] font-bold leading-[.98] tracking-[-.075em] text-[#173d36] max-[760px]:mt-4 max-[760px]:text-[57px] max-[390px]:text-[49px]">Fauna en Ruta</h1>
          <p className="max-w-[430px] text-[21px] font-semibold leading-[1.45] tracking-[-.025em] text-[#20534a] max-[760px]:text-lg">
            Detección, reporte y prevención de fauna silvestre en las rutas de Uruguay.
          </p>
          <p className="mb-[27px] mt-[18px] max-w-[430px] text-sm leading-[1.8] text-[#6d807b] max-[760px]:my-[13px] max-[760px]:text-[13px]">
            Una comunidad que comparte avistamientos para ayudar a que cada viaje sea más seguro
            para las personas y los animales.
          </p>
          <div className="flex flex-wrap gap-[11px]">
            <Link className="inline-flex min-h-12 items-center justify-center gap-[9px] rounded-[13px] bg-[#20534a] px-5 text-sm font-bold text-white transition hover:-translate-y-px hover:bg-[#173d36] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#287568] max-[760px]:px-[13px] max-[760px]:text-xs" href="/register">
              Comenzar ahora <ArrowRight aria-hidden="true" size={16} />
            </Link>
            <Link className="inline-flex min-h-12 items-center justify-center rounded-[13px] border border-[#dce5df] bg-white px-5 text-sm font-bold text-[#20534a] transition hover:-translate-y-px hover:bg-[#f0f6f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#287568] max-[760px]:px-[13px] max-[760px]:text-xs" href="/login">Ya tengo una cuenta</Link>
          </div>
          <div className="mt-[23px] flex items-center gap-[9px] text-[11px] text-[#6d807b]">
            <span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-[#e4f0e9] text-[#20534a]">
              <Check size={13} strokeWidth={3} />
            </span>
            Reportes comunitarios para viajar con más información.
          </div>
        </div>

        <div aria-hidden="true" className="min-h-[432px] rounded-[25px] border border-[#20534a]/[.08] bg-white/50 shadow-[0_23px_65px_rgba(29,66,54,.1)] max-[850px]:min-h-[375px] max-[760px]:min-h-[355px] max-[760px]:rounded-[19px]" />
      </section>

      <section aria-labelledby="features-title" className="pb-[62px] pt-[18px] max-[760px]:pb-9">
        <div className="mb-[25px] flex items-end justify-between gap-6 max-[760px]:items-start max-[760px]:flex-col max-[760px]:gap-[9px]">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.11em] text-[#287568]">Viajes más seguros, entre todos</span>
            <h2 id="features-title" className="mb-0 mt-[10px] max-w-[520px] text-[clamp(24px,3vw,34px)] font-bold leading-[1.15] tracking-[-.055em]">Información que te acompaña en el camino</h2>
          </div>
          <p className="mb-[3px] max-w-[260px] text-xs leading-[1.7] text-[#6d807b] max-[760px]:max-w-[380px]">
            Reporta, consulta y mantente atento a la fauna silvestre.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-[17px] max-[760px]:grid-cols-1 max-[760px]:gap-[10px]">
          {features.map((feature) => (
            <article className="min-h-[180px] rounded-[18px] border border-[#e4eae5] bg-white/75 p-[23px] max-[760px]:min-h-0 max-[760px]:p-[18px]" key={feature.number}>
              <div className="flex items-center justify-between">
                <span aria-hidden="true" className={`grid size-[38px] place-items-center rounded-[13px] ${feature.iconStyle}`}>
                  <feature.icon size={20} strokeWidth={1.8} />
                </span>
                <span className="text-[11px] font-bold tracking-[.08em] text-[#aab8af]">{feature.number}</span>
              </div>
              <h3 className="mb-[7px] mt-[17px] text-[15px] font-bold tracking-[-.025em] max-[760px]:mt-3">{feature.title}</h3>
              <p className="m-0 max-w-[310px] text-xs leading-[1.7] text-[#6d807b]">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="flex min-h-[69px] items-center justify-between gap-[14px] border-t border-[#20534a]/10 text-[11px] text-[#6d807b] max-[760px]:min-h-[61px]">
        <span>Fauna en Ruta <span className="px-[6px] text-[#b0bbb3]">·</span> Uruguay</span>
        <Link className="inline-flex items-center gap-1 text-[13px] font-bold text-[#20534a] underline-offset-4 hover:text-[#287568] hover:underline" href="/login">
          Ingresar a mi cuenta <ArrowRight aria-hidden="true" size={14} />
        </Link>
      </footer>
    </main>
  );
}
