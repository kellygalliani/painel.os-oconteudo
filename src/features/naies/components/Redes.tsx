"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, CalendarClock, Check, Copy, ExternalLink, Loader2, RotateCcw, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { avisar } from "@/components/shared/avisar";
import { IconeInstagram } from "@/components/shared/IconeInstagram";
import { IconeTiktok } from "@/components/shared/IconeTiktok";
import { cn } from "@/lib/utils";
import {
  checarPost,
  contasLivres,
  erroDoAgendamento,
  idiomasProntos,
  LIMITES,
  postsAtuais,
  quandoLegivel,
  REDES,
  sugestaoAgendamento,
  type ContaRede,
  type MetaVideo,
  type PostRede,
  type Rede,
} from "../logic/redes";
import { salvarLegenda } from "../server/actions";
import { cancelarPost, contasParaPostar, postarNasRedes, salvarLegendaTiktok } from "../server/redes";
import type { Idioma, Naie } from "../schema";
import { campanhaDasPalavras, ChipPalavra, type Campanha } from "@/features/campanhas";
import { EspacoVideo } from "./Videos";

const ESPERA_DESFAZER = 5000;

export function IconeRede({ rede, className }: { rede: Rede; className?: string }) {
  return rede === "instagram" ? <IconeInstagram className={className} /> : <IconeTiktok className={className} />;
}

// As contas do Zernio, uma busca por página (várias peças da tela usam a mesma).
let buscaContas: Promise<{ contas: ContaRede[] | null; falha: string | null }> | null = null;
export function useContas() {
  const [estado, setEstado] = useState<{ contas: ContaRede[] | null; falha: string | null }>({ contas: null, falha: null });
  useEffect(() => {
    buscaContas ??= contasParaPostar().then((r) => (r.ok ? { contas: r.dados, falha: null } : { contas: null, falha: r.erro }));
    let vivo = true;
    void buscaContas.then((e) => {
      if (vivo) setEstado(e);
      if (e.falha) buscaContas = null; // tenta de novo na próxima vez
    });
    return () => {
      vivo = false;
    };
  }, []);
  return estado;
}

/** Espera 5 segundos com "Desfazer" antes de publicar de verdade. */
function useComDesfazer() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [contando, setContando] = useState(false);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function agendar(rotulo: string, acao: () => void) {
    setContando(true);
    const id = toast(rotulo, {
      duration: ESPERA_DESFAZER,
      action: {
        label: "Desfazer",
        onClick: () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = null;
          setContando(false);
          toast("Cancelado. Nada foi publicado.");
        },
      },
    });
    timer.current = setTimeout(() => {
      timer.current = null;
      setContando(false);
      toast.dismiss(id);
      acao();
    }, ESPERA_DESFAZER);
  }
  return { contando, agendar };
}

function avisoDoResultado(r: { certos: number; falhas: string[]; postada: boolean }, agendado: boolean) {
  if (r.falhas.length && !r.certos) toast.error(`Não foi: ${r.falhas[0]}`);
  else if (r.falhas.length) toast.warning(`Uma conta falhou: ${r.falhas[0]}`);
  else toast.success(agendado ? "Agendado." : r.postada ? "Publicado. A NAIE está marcada como postada." : "Enviado para publicar.");
}

/** Os selos de cada conta: publicado, agendado, publicando ou falhou. */
export function SelosRedes({ posts, className }: { posts: PostRede[]; className?: string }) {
  const atuais = postsAtuais(posts);
  if (!atuais.length) return null;
  return (
    <span className={cn("inline-flex flex-wrap gap-1", className)}>
      {atuais.map((p) => (
        <span
          key={p.id}
          title={`${REDES[p.rede]} ${p.idioma.toUpperCase()} @${p.usuario}: ${p.status}${p.agendadoPara ? ` (${quandoLegivel(p.agendadoPara)})` : ""}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold",
            p.status === "publicado" && "border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
            p.status === "falhou" && "border-destructive/40 bg-destructive/10 text-destructive",
            (p.status === "agendado" || p.status === "publicando") && "text-muted-foreground",
          )}
        >
          <IconeRede rede={p.rede} className="size-3" />
          {p.idioma.toUpperCase()}
          {p.status === "publicado" ? <Check className="size-3" strokeWidth={3} /> : p.status === "falhou" ? <X className="size-3" strokeWidth={3} /> : p.status === "agendado" ? <CalendarClock className="size-3" /> : <Loader2 className="size-3 animate-spin" />}
        </span>
      ))}
    </span>
  );
}

/** Uma linha de post: status, link, cancelar ou tentar de novo. */
function LinhaPost({ post, aoTentar, ocupado }: { post: PostRede; aoTentar: (contaId: string) => void; ocupado: boolean }) {
  const router = useRouter();
  const [pend, start] = useTransition();
  const texto =
    post.status === "publicado" ? "publicado"
    : post.status === "agendado" ? `agendado para ${post.agendadoPara ? quandoLegivel(post.agendadoPara) : "—"}`
    : post.status === "publicando" ? "publicando… atualize em alguns minutos"
    : "não foi";
  return (
    <li className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-3 py-2 text-sm", post.status === "falhou" && "border-destructive/40")}>
      <IconeRede rede={post.rede} className="size-4 shrink-0" />
      <span className="font-medium">{REDES[post.rede]}</span>
      <span className={cn("text-muted-foreground", post.status === "publicado" && "text-emerald-700 dark:text-emerald-400", post.status === "falhou" && "text-destructive")}>{texto}</span>
      {post.link && <a href={post.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">ver post <ExternalLink className="size-3" /></a>}
      <span className="ml-auto flex gap-1">
        {post.status === "agendado" && (
          <Button variant="ghost" size="sm" disabled={pend} onClick={() => start(async () => { if (avisar(await cancelarPost(post.id), "Agendamento cancelado.")) router.refresh(); })}>
            Cancelar
          </Button>
        )}
        {post.status === "falhou" && (
          <Button variant="outline" size="sm" disabled={ocupado} onClick={() => aoTentar(post.contaId)}><RotateCcw className="size-4" /> Tentar de novo</Button>
        )}
      </span>
      {post.erro && post.status === "falhou" && <span className="w-full text-xs text-destructive">{post.erro}</span>}
    </li>
  );
}

/** Campo de legenda que salva ao sair, com contador e "Copiar". */
function CampoLegenda({ rotulo, valor, aoMudar, aoSalvar, placeholder }: { rotulo: string; valor: string; aoMudar: (t: string) => void; aoSalvar: (t: string) => Promise<boolean>; placeholder: string }) {
  const [salvo, setSalvo] = useState(valor);
  const [pend, start] = useTransition();
  const salvar = () => valor !== salvo && start(async () => { if (await aoSalvar(valor)) setSalvo(valor); });
  const longa = valor.length > LIMITES.legenda;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold uppercase tracking-wider text-muted-foreground">{rotulo}</span>
        <span className={cn("tabular-nums text-muted-foreground", longa && "font-semibold text-destructive")}>
          {pend ? "Salvando… · " : valor !== salvo ? "Não salva · " : ""}
          {valor.length}/{LIMITES.legenda}
        </span>
      </div>
      <Textarea rows={5} value={valor} onChange={(e) => aoMudar(e.target.value)} onBlur={salvar} placeholder={placeholder} aria-label={rotulo} />
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        disabled={!valor.trim()}
        onClick={async () => {
          salvar();
          try {
            await navigator.clipboard.writeText(valor);
            toast.success("Legenda copiada.");
          } catch {
            toast.error("O navegador bloqueou a cópia. Selecione o texto e copie.");
          }
        }}
      >
        <Copy className="size-4" /> Copiar
      </Button>
    </div>
  );
}

/** O cartão de publicar de um idioma: vídeo, legenda, contas, agora ou agendado, e os posts. */
function CartaoPublicar({ naie, idioma, contas, urlVideo, campanhas }: { naie: Naie; idioma: Idioma; contas: ContaRede[]; urlVideo?: string; campanhas: Campanha[] }) {
  const router = useRouter();
  const I = idioma.toUpperCase();
  const final = naie.finais[idioma];
  const posts = postsAtuais(naie.posts).filter((p) => p.idioma === idioma);
  const temTiktok = contas.some((c) => c.rede === "tiktok");

  const [legenda, setLegenda] = useState(naie.legendas[idioma] ?? "");
  const [legendaTt, setLegendaTt] = useState(naie.legendasTiktok[idioma] ?? "");
  const [ttDiferente, setTtDiferente] = useState(!!naie.legendasTiktok[idioma]);
  const livres = contasLivres(contas, naie.posts, idioma);
  const [marcadas, setMarcadas] = useState(() => livres.map((c) => c.id));
  const [modo, setModo] = useState<"agora" | "agendar">("agora");
  const [quando, setQuando] = useState(() => sugestaoAgendamento(naie.dataPrevista, new Date()));
  const [meta, setMeta] = useState<MetaVideo | null>(null);
  const [pend, start] = useTransition();
  const { contando, agendar } = useComDesfazer();
  // Automação: a campanha da palavra do roteiro (pode trocar ou desligar).
  const achada = campanhaDasPalavras(campanhas, naie.palavras[idioma], idioma);
  const doIdioma = campanhas.filter((c) => c.idioma === idioma);
  const [campanhaId, setCampanhaId] = useState<string | null>(achada?.campanha.id ?? null);
  const [automacao, setAutomacao] = useState(!!achada);
  const campanha = doIdioma.find((c) => c.id === campanhaId) ?? null;

  // Depois de publicar, as contas livres mudam: a seleção acompanha.
  const chaveLivres = livres.map((c) => c.id).join(",");
  useEffect(() => setMarcadas(chaveLivres ? chaveLivres.split(",") : []), [chaveLivres]);

  const escolhidas = contas.filter((c) => marcadas.includes(c.id));
  const redes = escolhidas.map((c) => c.rede);
  const { bloqueios, avisos } = checarPost({ redes, legenda, legendaTiktok: ttDiferente ? legendaTt : null, tamanho: final?.tamanho ?? null, meta });
  const erroQuando = modo === "agendar" ? erroDoAgendamento(quando, new Date()) : null;
  const nomes = [...new Set(redes)].map((r) => REDES[r]).join(" + ");
  const ocupado = pend || contando;

  function enviar(contaIds: string[], agendarPara: string | null) {
    start(async () => {
      const r = await postarNasRedes({ naieId: naie.id, idioma, contaIds, agendarPara, campanhaId: automacao ? campanhaId : null, semAutomacao: !automacao || !campanhaId });
      if (avisar(r)) avisoDoResultado(r.dados, !!agendarPara);
      router.refresh();
    });
  }

  function publicar() {
    if (modo === "agendar") return enviar(marcadas, quando);
    agendar(`Publicando ${I} em ${nomes} em 5 segundos…`, () => enviar(marcadas, null));
  }

  if (!contas.length) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border bg-background p-4">
        <span className="font-semibold">{I}</span>
        <p className="text-sm text-muted-foreground">Nenhuma conta {I} conectada ainda. Conecte no Zernio e acrescente o @ em <code>logic/redes.ts</code>.</p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-2xl border bg-background p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-lg font-semibold">{I}</span>
        <SelosRedes posts={posts} />
      </div>

      {final && urlVideo ? (
        <div className="flex flex-col gap-2">
          <video
            src={urlVideo}
            controls
            playsInline
            preload="metadata"
            className="mx-auto max-h-[420px] w-full max-w-[240px] rounded-xl bg-black object-contain"
            onLoadedMetadata={(e) => setMeta({ largura: e.currentTarget.videoWidth, altura: e.currentTarget.videoHeight, duracao: e.currentTarget.duration })}
          />
          <EspacoVideo naieId={naie.id} idioma={idioma} tipo="final" video={final} />
        </div>
      ) : (
        <EspacoVideo naieId={naie.id} idioma={idioma} tipo="final" video={final} dica="o vídeo editado" />
      )}

      <CampoLegenda
        rotulo={temTiktok && ttDiferente ? "Legenda do Instagram" : "Legenda"}
        valor={legenda}
        aoMudar={setLegenda}
        aoSalvar={async (t) => avisar(await salvarLegenda(naie.id, idioma, t))}
        placeholder="Cole aqui a legenda do post (com as hashtags)."
      />
      {temTiktok && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-foreground"
            checked={ttDiferente}
            onChange={(e) => {
              setTtDiferente(e.target.checked);
              if (!e.target.checked && legendaTt) { setLegendaTt(""); void salvarLegendaTiktok(naie.id, idioma, ""); }
            }}
          />
          Legenda diferente no TikTok
        </label>
      )}
      {temTiktok && ttDiferente && (
        <CampoLegenda rotulo="Legenda do TikTok" valor={legendaTt} aoMudar={setLegendaTt} aoSalvar={async (t) => avisar(await salvarLegendaTiktok(naie.id, idioma, t))} placeholder="Legenda só para o TikTok." />
      )}

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Onde</span>
        <div className="flex flex-wrap gap-2">
          {contas.map((c) => {
            const on = marcadas.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                disabled={ocupado}
                onClick={() => setMarcadas(on ? marcadas.filter((x) => x !== c.id) : [...marcadas, c.id])}
                className={cn("inline-flex min-w-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors", on ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}
              >
                <IconeRede rede={c.rede} className="size-4 shrink-0" />
                <span className="truncate">@{c.usuario}</span>
                {on && <Check className="size-3.5 shrink-0" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Automação de comentários</span>
        <div className="flex items-start gap-3 rounded-xl border bg-card p-3">
          <button type="button" role="switch" aria-checked={automacao && !!campanha} aria-label="Automação" disabled={ocupado || !doIdioma.length} onClick={() => setAutomacao(!automacao)} className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", automacao && campanha ? "bg-ok" : "bg-input")}>
            <span className={cn("absolute left-[3px] top-[3px] size-[18px] rounded-full bg-white shadow transition-transform", automacao && campanha && "translate-x-4")} />
          </button>
          <div className="flex min-w-0 flex-col gap-1.5 text-sm">
            {!doIdioma.length ? (
              <span className="text-muted-foreground">Nenhuma campanha {I} ainda. <a href={`/campanhas/nova?idioma=${idioma}${naie.palavras[idioma]?.[0] ? `&palavra=${encodeURIComponent(naie.palavras[idioma]![0])}` : ""}`} className="underline underline-offset-2">Criar campanha</a></span>
            ) : (
              <>
                <span className="flex flex-wrap items-center gap-1.5">
                  {naie.palavras[idioma]?.length ? <>Comentou {naie.palavras[idioma]!.map((p) => <ChipPalavra key={p} palavra={p} />)} →</> : <span className="text-muted-foreground">O roteiro não pede palavra. Use uma campanha mesmo assim:</span>}
                  <select aria-label="Campanha" value={campanhaId ?? ""} onChange={(e) => { setCampanhaId(e.target.value || null); setAutomacao(!!e.target.value); }} className="h-7 max-w-full rounded-md border bg-background px-2 text-sm font-semibold">
                    <option value="">sem campanha</option>
                    {doIdioma.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.status !== "ativa" ? ` (${c.status})` : ""}</option>)}
                  </select>
                </span>
                {!!naie.palavras[idioma]?.length && !achada && <span className="font-semibold text-aviso">{naie.palavras[idioma]!.join(", ")} não está em nenhuma campanha {I}.</span>}
                {campanha && campanha.status !== "ativa" && automacao && <span className="text-aviso">A campanha está {campanha.status}: a automação é criada mesmo assim, com as palavras dela.</span>}
                {campanha && automacao && <span className="text-xs text-muted-foreground">Instagram: DM com o link e resposta no comentário. TikTok: só a resposta (“{campanha.respostaTiktok || "sem resposta"}”), porque o TikTok não deixa mandar DM.</span>}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quando</span>
        <div className="inline-flex self-start rounded-full border p-0.5">
          {(["agora", "agendar"] as const).map((m) => (
            <button key={m} type="button" disabled={ocupado} onClick={() => setModo(m)} className={cn("rounded-full px-4 py-1 text-sm font-medium", modo === m ? "bg-foreground text-background" : "text-muted-foreground")}>
              {m === "agora" ? "Agora" : "Agendar"}
            </button>
          ))}
        </div>
        {modo === "agendar" && (
          <div className="flex flex-col gap-1">
            <input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} className="h-10 self-start rounded-md border bg-background px-3 text-sm" aria-label="Dia e hora do post" />
            <span className="text-xs text-muted-foreground">Horário de Brasília. Até 6 dias à frente; o Zernio publica sozinho na hora.</span>
          </div>
        )}
      </div>

      {(bloqueios.length > 0 || avisos.length > 0 || erroQuando) && (
        <ul className="flex flex-col gap-1 text-sm">
          {[...bloqueios, ...(erroQuando ? [erroQuando] : [])].map((b) => <li key={b} className="flex gap-2 text-destructive"><X className="mt-0.5 size-4 shrink-0" /> {b}</li>)}
          {avisos.map((a) => <li key={a} className="flex gap-2 text-amber-700 dark:text-amber-400"><AlertTriangle className="mt-0.5 size-4 shrink-0" /> {a}</li>)}
        </ul>
      )}

      <Button size="lg" className="w-full sm:w-auto sm:self-start" disabled={ocupado || bloqueios.length > 0 || !!erroQuando} onClick={publicar}>
        {pend ? <Loader2 className="size-5 animate-spin" /> : modo === "agendar" ? <CalendarClock className="size-5" /> : <Send className="size-5" />}
        {pend ? "Enviando… deixe esta tela aberta" : contando ? "Publicando em 5 s…" : modo === "agendar" ? `Agendar para ${quandoLegivel(`${quando}:00-03:00`)}` : `Publicar no ${nomes || "…"}`}
      </Button>
      {redes.includes("tiktok") && <p className="-mt-2 text-xs text-muted-foreground">No TikTok sai público, com comentários, dueto e stitch liberados.</p>}

      {posts.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {posts.map((p) => <LinhaPost key={p.id} post={p} ocupado={ocupado} aoTentar={(contaId) => agendar(`Tentando de novo no ${REDES[p.rede]} em 5 segundos…`, () => enviar([contaId], null))} />)}
        </ul>
      )}
    </div>
  );
}

/** Passo "Publicar" da NAIE: um cartão por idioma. */
export function Publicar({ naie, urls, campanhas = [] }: { naie: Naie; urls: Partial<Record<Idioma, string>>; campanhas?: Campanha[] }) {
  const { contas, falha } = useContas();
  if (falha) return <p className="text-sm text-muted-foreground">{falha}</p>;
  if (!contas) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Buscando as contas conectadas…</p>;
  // EN só aparece quando tem conta EN ou roteiro EN; PT sempre.
  const idiomas = (["pt", "en"] as const).filter((i) => i === "pt" || contas.some((c) => c.idioma === i) || naie.finais[i]);
  return (
    <div className="grid min-w-0 gap-3 lg:grid-cols-2">
      {idiomas.map((i) => <CartaoPublicar key={i} naie={naie} idioma={i} contas={contas.filter((c) => c.idioma === i)} urlVideo={urls[i]} campanhas={campanhas} />)}
    </div>
  );
}

/** Publicar com um clique, sem abrir a NAIE (tela Hoje): todas as contas livres dos idiomas prontos. */
export function PublicarRapido({ naie }: { naie: Naie }) {
  const router = useRouter();
  const { contas } = useContas();
  const [pend, start] = useTransition();
  const { contando, agendar } = useComDesfazer();
  const prontos = contas ? idiomasProntos(naie).filter((i) => contasLivres(contas, naie.posts, i).length) : [];
  if (!prontos.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {prontos.map((i) => {
        const livres = contasLivres(contas!, naie.posts, i);
        const nomes = [...new Set(livres.map((c) => REDES[c.rede]))].join(" + ");
        const { bloqueios } = checarPost({ redes: livres.map((c) => c.rede), legenda: naie.legendas[i] ?? "", legendaTiktok: naie.legendasTiktok[i], tamanho: naie.finais[i]?.tamanho ?? null });
        return (
          <Button
            key={i}
            disabled={pend || contando || bloqueios.length > 0}
            title={bloqueios.join(" ")}
            onClick={() =>
              agendar(`Publicando ${i.toUpperCase()} em ${nomes} em 5 segundos…`, () =>
                start(async () => {
                  const r = await postarNasRedes({ naieId: naie.id, idioma: i, contaIds: livres.map((c) => c.id), agendarPara: null });
                  if (avisar(r)) avisoDoResultado(r.dados, false);
                  router.refresh();
                }),
              )
            }
          >
            {pend ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} {contando ? "Publicando em 5 s…" : `Publicar ${i.toUpperCase()} no ${nomes}`}
          </Button>
        );
      })}
    </div>
  );
}

/** Agendar sem abrir a NAIE (quadro e Início): idioma, dia e hora, contas. */
export function DialogAgendar({ naie, aoFechar }: { naie: Naie; aoFechar: () => void }) {
  const router = useRouter();
  const { contas, falha } = useContas();
  const [pend, start] = useTransition();
  const prontos = contas ? idiomasProntos(naie).filter((i) => contasLivres(contas, naie.posts, i).length) : [];
  const [idioma, setIdioma] = useState<Idioma>("pt");
  const atual = prontos.includes(idioma) ? idioma : prontos[0];
  const livres = contas && atual ? contasLivres(contas, naie.posts, atual) : [];
  const [fora, setFora] = useState<string[]>([]);
  const [quando, setQuando] = useState(() => sugestaoAgendamento(naie.dataPrevista, new Date()));
  const erroQuando = erroDoAgendamento(quando, new Date());
  const escolhidas = livres.filter((c) => !fora.includes(c.id));
  const agendar = () =>
    start(async () => {
      const r = await postarNasRedes({ naieId: naie.id, idioma: atual, contaIds: escolhidas.map((c) => c.id), agendarPara: quando });
      if (avisar(r)) avisoDoResultado(r.dados, true);
      aoFechar();
      router.refresh();
    });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={aoFechar}>
      <div role="dialog" aria-label="Agendar" className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-card p-6 shadow-sombra-alta" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-semibold">Agendar {naie.tituloCurto}</h3>
        {falha ? <p className="text-sm text-muted-foreground">{falha}</p> : !contas ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Buscando as contas…</p> : !atual ? (
          <p className="text-sm text-muted-foreground">Ainda não dá: falta o vídeo final ou a legenda, ou as contas já têm post desta NAIE. Abra a aba Publicar da NAIE.</p>
        ) : (
          <>
            {prontos.length > 1 && <div className="inline-flex self-start rounded-full border p-0.5">{prontos.map((i) => <button key={i} onClick={() => setIdioma(i)} className={cn("rounded-full px-4 py-1 text-sm font-medium", atual === i ? "bg-foreground text-background" : "text-muted-foreground")}>{i.toUpperCase()}</button>)}</div>}
            <label className="flex flex-col gap-1"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dia e hora (Brasília)</span><input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm" /></label>
            {erroQuando && <p className="text-sm text-destructive">{erroQuando}</p>}
            <div className="flex flex-wrap gap-2">
              {livres.map((c) => { const on = !fora.includes(c.id); return <button key={c.id} type="button" aria-pressed={on} onClick={() => setFora(on ? [...fora, c.id] : fora.filter((x) => x !== c.id))} className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm", on ? "border-foreground bg-foreground text-background" : "text-muted-foreground")}><IconeRede rede={c.rede} className="size-4" />@{c.usuario}{on && <Check className="size-3.5" strokeWidth={3} />}</button>; })}
            </div>
            <p className="text-xs text-muted-foreground">Vai com a legenda {atual.toUpperCase()} e, se o roteiro pedir uma palavra, com a automação da campanha.</p>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          {atual && <Button disabled={pend || !escolhidas.length || !!erroQuando} onClick={agendar}>{pend ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />} Agendar para {quandoLegivel(`${quando}:00-03:00`)}</Button>}
          <Button variant="ghost" onClick={aoFechar}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}
