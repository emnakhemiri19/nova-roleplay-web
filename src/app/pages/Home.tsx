import {
  ArrowRight,
  Car,
  CheckCircle2,
  ChevronRight,
  LifeBuoy,
  MessageCircle,
  ShieldCheck,
  Ticket,
} from "lucide-react";

export default function Home() {
  return (
    <main className="nova-glow overflow-hidden">
      {/* HERO */}
      <section className="relative">
        <div className="nova-grid-bg absolute inset-0 opacity-40" />

        <div className="container-nrp relative py-24 sm:py-32 lg:py-36">
          <div className="mx-auto max-w-4xl text-center">

            <div className="eyebrow mx-auto">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-lg shadow-indigo-500/50" />
              Official Nova Role Play Portal
            </div>

            <h1 className="mt-7 text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Your city.
              <span className="block bg-gradient-to-r from-indigo-300 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Your story.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
              Welcome to Nova Role Play. Access community services,
              get support, browse vehicles and stay connected with
              the city.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="/tickets"
                className="btn-primary px-6 py-3"
              >
                <Ticket className="h-4 w-4" />
                Open Support Ticket
              </a>

              <a
                href="/shop"
                className="btn-secondary px-6 py-3"
              >
                <Car className="h-4 w-4" />
                Explore Vehicle Shop
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-600">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Discord authentication
              </span>

              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Live support
              </span>

              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Secure tickets
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="container-nrp relative pb-24">
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">
            Community
          </p>

          <h2 className="mt-2 section-title">
            Everything you need in one place
          </h2>

          <p className="section-description max-w-xl">
            Access Nova Role Play services without navigating through
            complicated menus.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">

          {/* SUPPORT */}
          <a
            href="/tickets"
            className="card-hover group relative overflow-hidden p-6"
          >
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/10">
                <LifeBuoy className="h-5 w-5" />
              </div>

              <div className="mt-6 flex items-center justify-between">
                <h3 className="font-semibold text-white">
                  Support Center
                </h3>

                <ChevronRight className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-indigo-400" />
              </div>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Get help with reports, donations, ban appeals and
                general community issues.
              </p>

              <div className="mt-5 text-sm font-medium text-indigo-400">
                Get support
              </div>
            </div>
          </a>

          {/* VEHICLES */}
          <a
            href="/shop"
            className="card-hover group relative overflow-hidden p-6"
          >
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />

            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/10">
                <Car className="h-5 w-5" />
              </div>

              <div className="mt-6 flex items-center justify-between">
                <h3 className="font-semibold text-white">
                  Vehicle Shop
                </h3>

                <ChevronRight className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-emerald-400" />
              </div>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Browse available vehicles and find the perfect ride
                for your next story.
              </p>

              <div className="mt-5 text-sm font-medium text-emerald-400">
                Browse vehicles
              </div>
            </div>
          </a>

          {/* DISCORD */}
          <div className="card-hover group relative overflow-hidden p-6">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-sky-500/10 blur-3xl" />

            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/10">
                <MessageCircle className="h-5 w-5" />
              </div>

              <div className="mt-6 flex items-center justify-between">
                <h3 className="font-semibold text-white">
                  Discord Community
                </h3>
              </div>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Stay connected with the Nova Role Play community
                and receive the latest updates.
              </p>

              <div className="mt-5 text-sm font-medium text-sky-400">
                Join the community
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SUPPORT CTA */}
      <section className="container-nrp pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-[var(--nova-surface)] to-[var(--nova-surface)] p-8 sm:p-10">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2 text-indigo-400">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-semibold">
                  Need assistance?
                </span>
              </div>

              <h2 className="mt-3 text-2xl font-bold text-white">
                Our support team is here to help.
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                Create a ticket and our team will review your request
                and respond directly through the support center.
              </p>
            </div>

            <a
              href="/tickets"
              className="btn-primary shrink-0"
            >
              Contact Support
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}