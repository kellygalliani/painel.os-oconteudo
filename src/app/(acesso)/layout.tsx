import { Marca } from "@/components/layout/Marca";

export default function LayoutAcesso({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="h-1 w-full rounded-full brand-gradient" />
        <Marca />
        {children}
      </div>
    </main>
  );
}
