"use client";

import { useSyncExternalStore } from "react";

const CHAVE = "tema";

/**
 * Script executado no <head> antes da página aparecer: aplica o tema salvo ou,
 * sem preferência salva, o do sistema operacional. Evita o "piscar" do tema claro.
 */
export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem("${CHAVE}");var e=t?t==="escuro":window.matchMedia("(prefers-color-scheme: dark)").matches;if(e)document.documentElement.classList.add("dark")}catch(_){}})();`;

function assinar(aoMudar: () => void) {
  const obs = new MutationObserver(aoMudar);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}
const escuroAgora = () => document.documentElement.classList.contains("dark");

/** Botão que alterna entre modo claro e escuro e lembra a escolha neste navegador. */
export function AlternarTema({ className = "", compacto = false }: { className?: string; compacto?: boolean }) {
  // null no servidor: o rótulo só aparece depois de saber o tema real do navegador
  const escuro = useSyncExternalStore(assinar, escuroAgora, () => null);
  return (
    <button
      type="button"
      className={`btn-secundario ${className}`}
      aria-label={escuro ? "Mudar para o modo claro" : "Mudar para o modo escuro"}
      onClick={() => {
        const novo = !document.documentElement.classList.contains("dark");
        document.documentElement.classList.toggle("dark", novo);
        try {
          localStorage.setItem(CHAVE, novo ? "escuro" : "claro");
        } catch {
          // navegação privada: vale só nesta visita
        }
      }}
    >
      <span aria-hidden="true">{escuro ? "☀" : "☾"}</span>
      {/* compacto: no celular mostra só o ícone (o aria-label descreve a ação) */}
      <span className={compacto ? "hidden sm:inline" : ""}>{escuro === null ? "Tema" : escuro ? "Modo claro" : "Modo escuro"}</span>
    </button>
  );
}
