'use client'

import { AdminSidebar } from './admin-sidebar'
import { RoleGuard } from '../role-guard'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <RoleGuard allowedRoles={['admin_master', 'admin_questoes']}>
      <div className="flex h-screen overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto lg:ml-64">
          <div className="container mx-auto p-6 pt-20 lg:p-8 lg:pt-8">
            {children}
          </div>
        </main>
      </div>
    </RoleGuard>
  )
}
