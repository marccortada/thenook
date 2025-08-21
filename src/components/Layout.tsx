import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Menu } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          {/* Header with menu trigger and language selector */}
          <header className="h-14 flex items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="hover:bg-muted p-2 rounded-md">
                <Menu className="h-4 w-4" />
              </SidebarTrigger>
              <h1 className="font-bold text-primary hidden sm:block">
                The Nook Madrid
              </h1>
            </div>
            <LanguageSelector />
          </header>

          {/* Main content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}