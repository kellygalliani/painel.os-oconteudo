import Image from "next/image";

export function Marca() {
  return (
    <span className="flex items-center gap-2">
      <Image src="/brand/logo-light-gradiente.svg" alt="oconteudo" width={112} height={28} className="h-6 w-auto dark:hidden" priority />
      <Image src="/brand/logo-dark-gradiente.svg" alt="oconteudo" width={112} height={28} className="hidden h-6 w-auto dark:block" priority />
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">OS</span>
    </span>
  );
}
