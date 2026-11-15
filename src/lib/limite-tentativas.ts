/**
 * Limite de tentativas de login, em memória (o sistema roda num único processo).
 * Conta só as falhas: quem acerta a senha não é afetado. Reiniciar o sistema zera
 * a contagem, o que é aceitável para o objetivo (frear tentativa de adivinhar senha).
 */
export class LimiteTentativas {
  private falhas = new Map<string, number[]>();

  constructor(
    private readonly maximo: number,
    private readonly janelaMs: number,
    private readonly agora: () => number = Date.now,
  ) {}

  private recentes(chave: string): number[] {
    const limite = this.agora() - this.janelaMs;
    const lista = (this.falhas.get(chave) ?? []).filter((t) => t > limite);
    if (lista.length) this.falhas.set(chave, lista);
    else this.falhas.delete(chave);
    return lista;
  }

  /** Segundos até poder tentar de novo; 0 se liberado. */
  bloqueadoPor(chave: string): number {
    const lista = this.recentes(chave);
    if (lista.length < this.maximo) return 0;
    // libera quando a falha mais antiga das últimas `maximo` sair da janela
    const maisAntiga = lista[lista.length - this.maximo];
    return Math.max(1, Math.ceil((maisAntiga + this.janelaMs - this.agora()) / 1000));
  }

  registrarFalha(chave: string) {
    const lista = this.recentes(chave);
    lista.push(this.agora());
    this.falhas.set(chave, lista);
    // evita crescer sem limite com chaves aleatórias
    if (this.falhas.size > 5_000) for (const k of [...this.falhas.keys()]) this.recentes(k);
  }

  limpar(chave: string) {
    this.falhas.delete(chave);
  }
}
