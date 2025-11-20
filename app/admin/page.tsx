'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileQuestion, Users, Flag, TrendingUp } from 'lucide-react'
import { useRole } from '@/lib/hooks/use-role'

export default function AdminDashboardPage() {
  const { userRole, isAdminMaster } = useRole()

  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Painel Administrativo
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo ao painel de administração do SintoniaMed
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Questões
              </CardTitle>
              <FileQuestion className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5,234</div>
              <p className="text-xs text-muted-foreground">
                +20 esta semana
              </p>
            </CardContent>
          </Card>

          {isAdminMaster && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Usuários Ativos
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2,148</div>
                  <p className="text-xs text-muted-foreground">
                    +180 este mês
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Reports Pendentes
                  </CardTitle>
                  <Flag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">
                    Requer atenção
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Taxa de Crescimento
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+12.5%</div>
                  <p className="text-xs text-muted-foreground">
                    vs. mês anterior
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesso rápido às funcionalidades principais
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <a
              href="/admin/questions/new"
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <FileQuestion className="h-8 w-8 text-primary" />
              <div>
                <div className="font-medium">Adicionar Questão</div>
                <div className="text-sm text-muted-foreground">
                  Criar nova questão no banco
                </div>
              </div>
            </a>

            {isAdminMaster && (
              <>
                <a
                  href="/admin/users"
                  className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
                >
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <div className="font-medium">Gerenciar Usuários</div>
                    <div className="text-sm text-muted-foreground">
                      Ver e editar usuários
                    </div>
                  </div>
                </a>

                <a
                  href="/admin/reports"
                  className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
                >
                  <Flag className="h-8 w-8 text-primary" />
                  <div>
                    <div className="font-medium">Ver Reports</div>
                    <div className="text-sm text-muted-foreground">
                      Revisar erros reportados
                    </div>
                  </div>
                </a>
              </>
            )}
          </CardContent>
        </Card>
      </div>
  )
}
