export default function Home() {
  return (
    <div className="container-nrp py-16">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
          Nova Role Play
        </h1>
        <p className="mt-4 text-lg text-zinc-400">
          Community hub — Discord login, support tickets, vehicle shop & staff tools.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <a href="/tickets" className="btn-primary">
            Open a Ticket
          </a>
          <a href="/shop" className="btn-secondary">
            Vehicle Shop
          </a>
        </div>
      </div>
    </div>
  );
}