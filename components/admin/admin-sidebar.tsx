'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useRole } from '@/lib/hooks/use-role'
import { LayoutDashboard, FileQuestion, Users, Flag, LogOut, Menu, X, Stethoscope, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { useState } from 'react'
import { useTheme } from '@/lib/theme-provider'
import Image from 'next/image'

const navigation = [
  {
    name: 'Dashboard',
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
    href: '/admin/medical-areas',
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
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { logout, userProfile } = useAuth()
  const { userRole, loading } = useRole()
  const { theme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Filtrar navegação baseado no role do usuário
  const filteredNavigation = navigation.filter((item) => {
    if (loading || !userRole) return false
    return item.roles.includes(userRole)
  })

  const handleLogout = async () => {
    await logout()
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed left-4 top-4 z-50 lg:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-background shadow-lg cursor-pointer"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 border-r bg-sidebar transition-transform duration-300 lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b px-6">
            <Image
              src={theme === 'light' ? "/logo-sintoniamed-light.png" : "/logo-sintoniamed-dark.png"}
              alt="SintoniaMed"
              width={160}
              height={40}
              className="h-8 w-auto"
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {filteredNavigation.map((item) => {
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
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User info and logout */}
          <div className="border-t p-4">
            <div className="mb-3 space-y-1 px-2">
              <p className="text-sm font-medium text-sidebar-foreground">
                {userProfile?.name}
              </p>
              <p className="text-xs text-muted-foreground">{userProfile?.email}</p>
              <p className="text-xs font-medium text-primary">
                {userRole === 'admin_master' && 'Admin Master'}
                {userRole === 'admin_questoes' && 'Admin de Questões'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
