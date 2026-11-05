/**
 * Aparece no instante do clique, enquanto o servidor monta a página (o menu fica onde está).
 * Sem isto, a tela antiga ficava parada até a nova chegar, e o clique parecia não funcionar.
 */
export default function Carregando() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true" aria-label="Carregando">
      <div className="flex flex-col gap-3">
        <div className="h-3 w-40 rounded-full bg-muted" />
        <div className="h-8 w-72 max-w-full rounded-lg bg-muted" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-28 rounded-full bg-muted" />
        <div className="h-8 w-28 rounded-full bg-muted" />
        <div className="h-8 w-20 rounded-full bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
