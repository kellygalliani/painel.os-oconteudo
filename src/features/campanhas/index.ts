// API pública do módulo campanhas (cliente e lógica pura). Servidor: ./server.ts.
export * from "./schema";
export { salvarCampanha, mudarStatusCampanha, apagarCampanha, salvarModelo, apagarModelo } from "./server/actions";
export { campanhaDasPalavras, palavrasSemCampanha, taxaDeClique, textoDaDm, limparPalavras, faltaParaAtivar, conflitos, duplicarPara, NUMEROS_ZERO } from "./logic/campanhas";
export { palavrasSoltas, proximosDaCampanha } from "./logic/ligacoes";
export { ListaCampanhas, AvisoPalavraSolta, ChipPalavra, ChipIdioma, ChipStatusCampanha, type PalavraSolta } from "./components/Campanhas";
export { EditarCampanha, type ProximoPost } from "./components/EditarCampanha";
export { TabelaContatos } from "./components/Contatos";
