export default function Carregando() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Carregando">
      <div className="mb-6 h-8 w-56 rounded-lg bg-slate-200" />
      <div className="cartao h-64" />
    </div>
  );
}
