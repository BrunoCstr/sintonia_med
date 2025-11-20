import type { Metadata } from 'next'
import { DashboardLayout } from '@/components/dashboard-layout'

export const metadata: Metadata = {
  title: 'Painel Administrativo - SintoniaMed',
  description: 'Painel de administração do SintoniaMed',
}

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
