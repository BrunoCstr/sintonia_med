import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Painel Administrativo - SintoniaMed',
  description: 'Painel de administração do SintoniaMed',
}

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
