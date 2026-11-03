import type { ComponentProps, ReactNode } from "react";

type ErrosProps = { erros?: string[] };

export function ErrosCampo({ erros }: ErrosProps) {
  if (!erros?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{erros[0]}</p>;
}

export function Erro({ mensagem }: { mensagem?: string }) {
  if (!mensagem) return null;
  return (
    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {mensagem}
    </p>
  );
}

type CampoProps = ComponentProps<"input"> & {
  rotulo: string;
  name: string;
  erros?: string[];
  ajuda?: ReactNode;
  prefixo?: string;
  sufixo?: string;
};

export function Campo({ rotulo, erros, ajuda, prefixo, sufixo, className, ...input }: CampoProps) {
  const invalido = !!erros?.length;
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">{rotulo}</span>
      <span className="relative block">
        {prefixo && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
            {prefixo}
          </span>
        )}
        <input
          {...input}
          aria-invalid={invalido || undefined}
          className={`input ${prefixo ? "pl-10" : ""} ${sufixo ? "pr-9" : ""}`}
        />
        {sufixo && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
            {sufixo}
          </span>
        )}
      </span>
      {ajuda && !invalido && <span className="mt-1 block text-xs text-slate-500">{ajuda}</span>}
      <ErrosCampo erros={erros} />
    </label>
  );
}

type SelecaoProps = ComponentProps<"select"> & {
  rotulo: string;
  name: string;
  erros?: string[];
  children: ReactNode;
};

export function Selecao({ rotulo, erros, children, className, ...select }: SelecaoProps) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">{rotulo}</span>
      <select {...select} aria-invalid={erros?.length ? true : undefined} className="input">
        {children}
      </select>
      <ErrosCampo erros={erros} />
    </label>
  );
}

type AreaTextoProps = ComponentProps<"textarea"> & { rotulo: string; name: string; erros?: string[] };

export function AreaTexto({ rotulo, erros, className, ...textarea }: AreaTextoProps) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">{rotulo}</span>
      <textarea {...textarea} aria-invalid={erros?.length ? true : undefined} className="input min-h-20" />
      <ErrosCampo erros={erros} />
    </label>
  );
}
