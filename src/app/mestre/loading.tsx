export default function Carregando() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Carregando">
      <div className="mb-6 h-8 w-56 rounded-lg bg-slate-200" />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div className="cartao h-24" />
        <div className="cartao h-24" />
        <div className="cartao h-24" />
      </div>
      <div className="cartao h-64" />
    </div>
  );
}
