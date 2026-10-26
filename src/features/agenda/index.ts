// API pública do módulo agenda para telas e outros módulos (cliente e lógica pura).
// O que é só de servidor fica em ./server.ts.
export * from "./schema";
export { Agenda, Pendentes } from "./components/Agenda";
export { ItemAgenda, DialogMover, type Mover } from "./components/ItemAgenda";
export { prepararDados, periodo } from "./logic/dados-tela";
export { cargaDaSocia } from "./logic/montar";
