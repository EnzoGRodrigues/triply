import { BottomNav } from "@/components/BottomNav";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { UserProvider } from "@/components/UserProvider";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <UserProvider>
      <div className="flex min-h-dvh flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-12 lg:pt-10">
          {children}
        </main>
        <SiteFooter className="max-md:hidden" />
      </div>
      <BottomNav />
    </UserProvider>
  );
}
