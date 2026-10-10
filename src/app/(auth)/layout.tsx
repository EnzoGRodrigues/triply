import { BrandPanel } from "@/components/BrandPanel";
import { SiteFooter } from "@/components/SiteFooter";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <BrandPanel />
      <div className="flex min-h-dvh flex-col">
        <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
