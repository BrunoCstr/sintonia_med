'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useRole } from '@/lib/hooks/use-role'
import { useTheme } from '@/lib/theme-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Home, FileText, User, Settings, LogOut, Moon, Sun, Menu, History, Shield, LayoutDashboard, FileQuestion, Users, Flag, Stethoscope, Ticket, Bug, CreditCard, Bell, Star } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { RoleGuard } from '@/components/role-guard'
import { ReportDialog } from '@/components/report-dialog'
import { NoticePopup } from '@/components/notice-popup'

const navigation = [
  { name: 'Página Inicial', href: '/dashboard', icon: Home },
  { name: 'Gerar Questões', href: '/generator', icon: FileText },
  { name: 'Histórico', href: '/history', icon: History },
  { name: 'Questões Favoritadas', href: '/favorites', icon: Star },
  { name: 'Perfil', href: '/profile', icon: User },
  { name: 'Configurações', href: '/settings', icon: Settings },
]

const adminNavigation = [
  {
    name: 'Página Inicial',
    href: '/admin',
    icon: LayoutDashboard,
    roles: ['admin_master', 'admin_questoes'],
  },
  {
    name: 'Questões',
    href: '/admin/questions',
    icon: FileQuestion,
    roles: ['admin_master', 'admin_questoes'],
  },
  {
    name: 'Sistemas',
    href: '/admin/sistemas',
    icon: Stethoscope,
    roles: ['admin_master', 'admin_questoes'],
  },
  {
    name: 'Usuários',
    href: '/admin/users',
    icon: Users,
    roles: ['admin_master'],
  },
  {
    name: 'Reports',
    href: '/admin/reports',
    icon: Flag,
    roles: ['admin_master'],
  },
  {
    name: 'Cupons',
    href: '/admin/coupons',
    icon: Ticket,
    roles: ['admin_master'],
  },
  {
    name: 'Planos',
    href: '/admin/plans',
    icon: CreditCard,
    roles: ['admin_master'],
  },
  {
    name: 'Avisos',
    href: '/admin/notices',
    icon: Bell,
    roles: ['admin_master'],
  },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, logout } = useAuth()
  const { hasAccessToAdminPanel, userRole } = useRole()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  
  const isAdminRoute = pathname?.startsWith('/admin')
  
  const filteredAdminNavigation = adminNavigation.filter((item) => {
    if (!userRole) return false
    return item.roles.includes(userRole)
  })

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleLabel = () => {
    if (userRole === 'admin_master') return 'Admin Master'
    if (userRole === 'admin_questoes') return 'Admin de Questões'
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-20 items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="cursor-pointer border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 shadow-md hover:shadow-lg transition-all"
                  title="Abrir menu de navegação"
                >
                  <Menu className="h-6 w-6 text-primary font-bold" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
                <div className="flex h-full flex-col">
                  <div className="flex h-20 items-center justify-center gap-2 border-b px-6">
                    <Image 
                      src={theme === 'light' ? "/logo-sintoniamed-light.png" : "/logo-sintoniamed-dark.png"} 
                      alt="SintoniaMed" 
                      width={240}
                      height={60}
                      className="h-20 w-auto"
                    />
                  </div>
                  <nav className="flex-1 space-y-1 p-4">
                    {navigation.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          {item.name}
                        </Link>
                      )
                    })}
                    {hasAccessToAdminPanel && (
                      <>
                        <div className="my-2 border-t" />
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                          ADMINISTRAÇÃO
                        </div>
                        {filteredAdminNavigation.map((item) => {
                          const Icon = item.icon
                          // Para o Dashboard (/admin), só marca como ativo se for exatamente /admin
                          // Para outras rotas, marca se for exatamente igual ou começar com a rota + '/'
                          const isActive = item.href === '/admin'
                            ? pathname === '/admin'
                            : pathname === item.href || pathname?.startsWith(item.href + '/')
                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                              )}
                            >
                              <Icon className="h-5 w-5" />
                              {item.name}
                            </Link>
                          )
                        })}
                      </>
                    )}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/dashboard" className="flex items-center gap-2">
              <Image 
                src={theme === 'light' ? "/logo-sintoniamed-light.png" : "/logo-sintoniamed-dark.png"} 
                alt="SintoniaMed" 
                width={200}
                height={50}
                className="hidden h-16 w-auto sm:block"
              />
              <Image 
                src={theme === 'light' ? "/logo-sintoniamed-light.png" : "/logo-sintoniamed-dark.png"} 
                alt="SintoniaMed" 
                width={120}
                height={50}
                className="block h-14 w-auto sm:hidden"
              />
            </Link>

          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {hasAccessToAdminPanel && (
              <Button variant="outline" size="sm" asChild className="gap-2 cursor-pointer">
                <Link href="/admin">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Painel Admin</span>
                </Link>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReportDialog(true)}
              className="gap-2 cursor-pointer"
              title="Suporte"
            >
              <Bug className="h-4 w-4" />
              <span className="hidden sm:inline">Suporte</span>
            </Button>

            <Button variant="ghost" size="icon" onClick={toggleTheme} className="cursor-pointer">
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 gap-2 rounded-full cursor-pointer">
                  <Avatar className="h-8 w-8">
                    {userProfile?.photoURL && (
                      <AvatarImage
                        src={userProfile.photoURL}
                        alt={userProfile.name || 'Avatar'}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                      {userProfile ? getInitials(userProfile.name) : 'US'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{userProfile?.name.split(' ')[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{userProfile?.name}</p>
                    <p className="text-xs text-muted-foreground">{userProfile?.email}</p>
                    <p className="text-xs text-muted-foreground">{userProfile?.period}</p>
                    {getRoleLabel() && (
                      <p className="text-xs font-medium text-primary">{getRoleLabel()}</p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hasAccessToAdminPanel && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" />
                        Painel Admin
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="w-full px-6 py-8 lg:px-8">
          {isAdminRoute ? (
            <RoleGuard allowedRoles={['admin_master', 'admin_questoes']}>
              {children}
            </RoleGuard>
          ) : (
            children
          )}
        </div>
      </main>

      {/* Report Dialog */}
      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        questionId={null}
      />

      {/* Notice Popup */}
      <NoticePopup />
    </div>
  )
}
