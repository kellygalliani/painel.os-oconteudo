// As contas de Estratégia/Financeiro/projecao.html (a planilha é a referência), em funções puras.

type Num = number | string;
export type Bump = { id: string; name: string; price: Num[]; take: Num[] };
export type Produto = { id: string; name: string; inv: Num[]; cpc: Num[]; conv: Num[]; preco: Num[]; bumps: Bump[] };
export type Custo = { id: string; name: string; type: "pct" | "venda" | "fixo" | "anual"; value: Num; from?: number; products: string[]; alloc?: "igual" | "inteiro" | "proporcional"; base?: "tudo" | "produto" };
export type DadosProjecao = { v?: number; start: string; months: number; adTax: Num; products: Produto[]; costs: Custo[] };

export type Consolidado = { inv: number[]; ads: number[]; cliq: number[]; vend: number[]; fatP: number[]; fatB: number[]; fat: number[]; vendB: number[]; custo: number[]; lucro: number[] };

export function numero(v: Num | undefined): number {
  if (typeof v === "number") return v;
  let s = String(v ?? "").replace(/R\$|%|\s|x/gi, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

const em = (a: Num[], m: number) => numero(a[Math.min(m, a.length - 1)] ?? 0);
const soma = (a: number[]) => a.reduce((s, x) => s + x, 0);

export function calcular(d: DadosProjecao): Consolidado {
  const n = d.months;
  const imposto = numero(d.adTax) / 100;
  type R = Consolidado;
  const P: Record<string, R> = {};
  for (const p of d.products) {
    const r: R = { inv: [], ads: [], cliq: [], vend: [], fatP: [], fatB: [], fat: [], vendB: [], custo: [], lucro: [] };
    for (let m = 0; m < n; m++) {
      const inv = em(p.inv, m), cpc = em(p.cpc, m), conv = em(p.conv, m) / 100, preco = em(p.preco, m);
      const ads = inv / (1 + imposto);
      const cliq = cpc > 0 ? ads / cpc : 0, vend = cliq * conv, fatP = vend * preco;
      let fatB = 0, vendB = 0;
      for (const b of p.bumps ?? []) {
        const bv = (vend * em(b.take, m)) / 100;
        vendB += bv;
        fatB += bv * em(b.price, m);
      }
      r.inv.push(inv); r.ads.push(ads); r.cliq.push(cliq); r.vend.push(vend);
      r.fatP.push(fatP); r.fatB.push(fatB); r.fat.push(fatP + fatB); r.vendB.push(vendB); r.custo.push(0);
    }
    P[p.id] = r;
  }

  for (const c of d.costs) {
    const ps = c.products.filter((id) => P[id]);
    if (!ps.length) continue;
    let val = numero(c.value);
    if (c.type === "anual") val /= 12;
    for (let m = 0; m < n; m++) {
      if (m + 1 < (c.from ?? 1)) continue;
      const parte: Record<string, number> = {};
      if (c.type === "fixo" || c.type === "anual") {
        if (c.alloc === "inteiro") ps.forEach((id) => (parte[id] = val));
        else if (c.alloc === "proporcional") {
          const tot = ps.reduce((s, id) => s + P[id].fat[m], 0);
          ps.forEach((id) => (parte[id] = tot > 0 ? (val * P[id].fat[m]) / tot : val / ps.length));
        } else ps.forEach((id) => (parte[id] = val / ps.length));
      } else if (c.type === "pct") ps.forEach((id) => (parte[id] = ((c.base === "produto" ? P[id].fatP[m] : P[id].fat[m]) * val) / 100));
      else ps.forEach((id) => (parte[id] = (c.base === "produto" ? P[id].vend[m] : P[id].vend[m] + P[id].vendB[m]) * val));
      ps.forEach((id) => (P[id].custo[m] += parte[id]));
    }
  }

  const C: Consolidado = { inv: [], ads: [], cliq: [], vend: [], fatP: [], fatB: [], fat: [], vendB: [], custo: [], lucro: [] };
  const chaves = Object.keys(C) as (keyof Consolidado)[];
  for (let m = 0; m < n; m++) {
    for (const r of Object.values(P)) r.lucro[m] = r.fat[m] - r.inv[m] - r.custo[m];
    for (const k of chaves) C[k].push(soma(Object.values(P).map((r) => r[k][m])));
  }
  return C;
}

export function totais(c: Consolidado) {
  return { faturamento: soma(c.fat), investimento: soma(c.inv), custos: soma(c.custo), lucro: soma(c.lucro), vendas: soma(c.vend), bumps: soma(c.vendB) };
}

/** Mês ("AAAA-MM") de cada posição da projeção. */
export function mesDoIndice(d: DadosProjecao, m: number): string {
  const [a, mes] = d.start.split("-").map(Number);
  const t = a * 12 + (mes - 1) + m;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

/** Meta do mês (vendas, faturamento, investimento) para a página Hoje. */
export function metaDoMes(d: DadosProjecao, mes: string) {
  const c = calcular(d);
  for (let m = 0; m < d.months; m++) if (mesDoIndice(d, m) === mes) return { vendas: c.vend[m], faturamento: c.fat[m], investimento: c.inv[m] };
  return null;
}
