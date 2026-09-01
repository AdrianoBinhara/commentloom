import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { BookOpenCheck, LayoutDashboard, LogOut, PanelLeft, Workflow } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const menuItems = [
  { icon: LayoutDashboard, label: "Visão geral", index: "01", path: "/" },
  { icon: Workflow, label: "Automações", index: "02", path: "/automacoes" },
  { icon: BookOpenCheck, label: "Configuração", index: "03", path: "/configuracao" },
];

const SIDEBAR_WIDTH_KEY = "commentloom-sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 220;
const MAX_WIDTH = 380;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString()), [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-white p-5">
        <section className="rule-card w-full max-w-lg p-8 sm:p-12">
          <div className="mb-20 flex items-center gap-3"><span className="red-square" /><span className="text-sm font-bold tracking-tight">COMMENTLOOM</span></div>
          <p className="page-kicker mb-3">Acesso restrito</p>
          <h1 className="max-w-sm text-4xl font-bold leading-[.95] tracking-[-0.055em] sm:text-5xl">Controle suas respostas privadas.</h1>
          <p className="mt-7 max-w-md text-sm leading-6 text-muted-foreground">Entre para configurar automações aprovadas de comentários em Reels e acompanhar cada entrega.</p>
          <Button asChild className="mt-10 h-12 rounded-none bg-black px-6 text-xs font-bold uppercase tracking-[.12em] hover:bg-[#e62222]"><a href="/login">Entrar no painel</a></Button>
        </section>
      </main>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardContent setSidebarWidth={setSidebarWidth}>{children}</DashboardContent>
    </SidebarProvider>
  );
}

function DashboardContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (width: number) => void }) {
  const { user, logout } = useAuth();
  const { toggleSidebar } = useSidebar();
  const [location, setLocation] = useLocation();
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const page = menuItems.find(item => item.path === location);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      if (!isResizing) return;
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const width = event.clientX - left;
      if (width >= MIN_WIDTH && width <= MAX_WIDTH) setSidebarWidth(width);
    };
    const up = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
      document.body.style.cursor = "col-resize";
    }
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div ref={sidebarRef} className="relative">
        <Sidebar collapsible="icon" className="border-r border-black bg-[#f8f8f6]">
          <SidebarHeader className="h-[83px] justify-center border-b border-black px-4">
            <div className="flex w-full items-center gap-3 group-data-[collapsible=icon]:justify-center">
              <button onClick={toggleSidebar} className="grid h-8 w-8 place-items-center border border-black bg-white transition-colors hover:bg-[#e62222] hover:text-white" aria-label="Alternar navegação"><PanelLeft className="h-4 w-4" /></button>
              <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden"><span className="red-square" /><span className="text-sm font-bold tracking-tight">COMMENTLOOM</span></div>
            </div>
          </SidebarHeader>
          <SidebarContent className="pt-5">
            <p className="page-kicker px-5 pb-2 group-data-[collapsible=icon]:hidden">Operação</p>
            <SidebarMenu className="gap-0 px-3">
              {menuItems.map(item => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton isActive={location === item.path} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-11 rounded-none border-b border-black/15 px-2 font-semibold transition-none hover:bg-black hover:text-white data-[active=true]:bg-black data-[active=true]:text-white">
                    <span className="mr-1 text-[9px] font-bold text-[#e62222] group-data-[collapsible=icon]:hidden">{item.index}</span>
                    <item.icon className="h-4 w-4" /><span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t border-black p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 p-2 text-left hover:bg-black hover:text-white group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-8 w-8 rounded-none border border-current"><AvatarFallback className="rounded-none bg-white text-xs font-bold text-black">{user?.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback></Avatar>
                  <div className="min-w-0 group-data-[collapsible=icon]:hidden"><p className="truncate text-xs font-bold">{user?.name || "Operador"}</p><p className="mt-0.5 truncate text-[10px] opacity-60">Sessão autenticada</p></div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-none border-black">
                <DropdownMenuItem onClick={logout} className="cursor-pointer rounded-none text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div className="absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize hover:bg-[#e62222]" onMouseDown={() => setIsResizing(true)} />
      </div>
      <SidebarInset className="min-w-0 bg-white">
        {isMobile && <header className="sticky top-0 z-30 flex h-[57px] items-center justify-between border-b border-black bg-white px-4"><div className="flex items-center gap-3"><SidebarTrigger className="rounded-none border border-black" /><span className="text-xs font-bold uppercase tracking-[.12em]">{page?.label ?? "CommentLoom"}</span></div><span className="red-square" /></header>}
        <main className="min-h-screen">{children}</main>
      </SidebarInset>
    </>
  );
}
