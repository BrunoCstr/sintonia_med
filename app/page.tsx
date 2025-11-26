'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { ArrowRight, Target, Zap, CheckCircle, TrendingUp, Award, Clock, BookOpen, Users } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTheme } from '@/lib/theme-provider'

export default function WelcomePage() {
  const { user, loading } = useAuth()
  const { theme } = useTheme()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <section className="relative overflow-hidden px-4 py-16 lg:py-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-secondary/5 blur-3xl" />
        </div>
        
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left: Content */}
            <div className="flex flex-col justify-center space-y-8">
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-4"
              >
                <Image 
                  src={theme === 'light' ? "/logo-sintoniamed-light.png" : "/logo-sintoniamed-dark.png"} 
                  alt="SintoniaMed" 
                  width={320}
                  height={96}
                  className="h-20 w-auto transition-transform hover:scale-105 lg:h-24"
                  priority
                />
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="space-y-4"
              >
                <h1 className="text-balance text-5xl font-bold leading-tight tracking-tight text-foreground lg:text-7xl">
                  Estude medicina com{' '}
                  <span className="relative inline-block">
                    <span className="relative z-10 text-primary">inteligência</span>
                    <span className="absolute bottom-2 left-0 h-3 w-full bg-primary/20" />
                  </span>
                </h1>
                
                <p className="text-pretty text-lg text-muted-foreground lg:text-xl">
                  Mais de <strong className="text-foreground">5.000 questões comentadas</strong> das principais provas do país. Simulados personalizados, análise de desempenho e evolução constante.
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col gap-4 sm:flex-row"
              >
                <Button asChild size="lg" className="gap-2 cursor-pointer shadow-lg shadow-primary/20">
                  <Link href="/auth/register">
                    Começar agora
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="gap-2 border-primary/20 cursor-pointer">
                  <Link href="/auth/login">
                    Já tenho conta
                  </Link>
                </Button>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="grid grid-cols-3 gap-6 pt-8"
              >
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="space-y-1"
                >
                  <div className="text-3xl font-bold text-primary">5K+</div>
                  <div className="text-sm text-muted-foreground">Questões</div>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="space-y-1"
                >
                  <div className="text-3xl font-bold text-primary">98%</div>
                  <div className="text-sm text-muted-foreground">Satisfação</div>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="space-y-1"
                >
                  <div className="text-3xl font-bold text-primary">2K+</div>
                  <div className="text-sm text-muted-foreground">Estudantes</div>
                </motion.div>
              </motion.div>
            </div>

            {/* Right: Image with floating cards */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative"
            >
              <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
                <img
                  src="/medical-student-studying-with-laptop-and-books-in-.jpg"
                  alt="Estudante de medicina estudando"
                  className="h-auto w-full object-cover"
                />
              </div>
              
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="absolute -bottom-6 -left-6 rounded-2xl border border-border bg-card p-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-success/10 p-3">
                    <TrendingUp className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">+32%</div>
                    <div className="text-sm text-muted-foreground">De acertos</div>
                  </div>
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 }}
                whileHover={{ scale: 1.05, y: 5 }}
                className="absolute -right-6 -top-6 rounded-2xl border border-border bg-card p-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Award className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">Top 10%</div>
                    <div className="text-sm text-muted-foreground">Ranking</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="border-y bg-card px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-balance text-4xl font-bold">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-lg text-muted-foreground">
              Ferramentas completas para acelerar sua aprovação
            </p>
          </motion.div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Target, title: 'Simulados Personalizados', description: 'Crie provas sob medida com filtros de período, matéria, dificuldade e quantidade. Modo cronometrado para simular o dia da prova.', color: 'primary' },
              { icon: Target, title: 'Gabarito Comentado', description: 'Todas as questões com explicações detalhadas. Entenda o raciocínio por trás de cada alternativa correta e incorreta.', color: 'secondary' },
              { icon: Target, title: 'Dashboard Inteligente', description: 'Acompanhe seu progresso com gráficos detalhados. Identifique pontos fracos e otimize seus estudos com dados reais.', color: 'accent' },
              { icon: Target, title: 'Histórico Completo', description: 'Revise todos os seus simulados anteriores. Compare desempenho e veja sua evolução ao longo do tempo.', color: 'chart-4' },
              { icon: Target, title: 'Questões Oficiais', description: 'Banco atualizado com questões das principais provas: REVALIDA, ENARE, residências e concursos médicos.', color: 'success' },
              { icon: Target, title: 'Comunidade Ativa', description: 'Comente, tire dúvidas e interaja com outros estudantes. Aprendizado colaborativo que multiplica resultados.', color: 'primary' },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="group rounded-2xl border bg-background p-8 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className={`mb-4 inline-flex rounded-xl bg-${feature.color}/10 p-4 transition-colors group-hover:bg-${feature.color} group-hover:text-${feature.color}-foreground`}>
                  <feature.icon className="h-8 w-8" />
                </div>
                <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-12 lg:p-16">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="space-y-6">
                <h2 className="text-balance text-3xl font-bold lg:text-4xl">
                  Junte-se a milhares de estudantes que já estão aprovando
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-1 h-6 w-6 shrink-0 text-success" />
                    <div>
                      <div className="font-semibold text-foreground">Planos acessíveis</div>
                      <div className="text-sm text-muted-foreground">A partir de R$ 29,90/mês com acesso completo</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-1 h-6 w-6 shrink-0 text-success" />
                    <div>
                      <div className="font-semibold text-foreground">Cancele quando quiser</div>
                      <div className="text-sm text-muted-foreground">Sem fidelidade ou taxas escondidas</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-1 h-6 w-6 shrink-0 text-success" />
                    <div>
                      <div className="font-semibold text-foreground">Suporte dedicado</div>
                      <div className="text-sm text-muted-foreground">Tire dúvidas diretamente com nossa equipe</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col justify-center space-y-6 rounded-2xl border bg-card p-8 shadow-xl">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Oferta especial</div>
                  <div className="text-4xl font-bold text-foreground">R$ 29,90<span className="text-xl font-normal text-muted-foreground">/mês</span></div>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span>Acesso ilimitado a todas as questões</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span>Simulados personalizados sem limite</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span>Dashboard com análise de desempenho</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span>Gabarito comentado por especialistas</span>
                  </li>
                </ul>
                <Button asChild size="lg" className="w-full gap-2 shadow-lg shadow-primary/20">
                  <Link href="/plans">
                    Ver todos os planos
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-card px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-6 py-3 text-sm font-medium text-primary">
            <Award className="h-5 w-5" />
            Aprovação garantida ou seu dinheiro de volta
          </div>
          
          <h2 className="mb-6 text-balance text-4xl font-bold lg:text-5xl">
            Comece a estudar com o SintoniaMed hoje mesmo
          </h2>
          
          <p className="mb-8 text-lg text-muted-foreground">
            Não perca mais tempo com métodos de estudo ineficientes. Junte-se aos aprovados.
          </p>
          
          <Button asChild size="lg" className="gap-2 text-lg shadow-lg shadow-primary/20">
            <Link href="/auth/register">
              Criar minha conta grátis
              <ArrowRight className="h-6 w-6" />
            </Link>
          </Button>
          
          <p className="mt-4 text-sm text-muted-foreground">
            7 dias de garantia • Sem cartão de crédito
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-accent px-4 py-12 text-accent-foreground">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-4">
              <Image 
                src={theme === 'light' ? "/logo-sintoniamed-light.png" : "/logo-sintoniamed-dark.png"} 
                alt="SintoniaMed" 
                width={200}
                height={50}
                className="h-10 w-auto"
              />
              <p className="text-sm opacity-80">
                A plataforma completa para sua aprovação em medicina.
              </p>
            </div>
            
            <div>
              <h3 className="mb-4 font-semibold">Produto</h3>
              <ul className="space-y-2 text-sm opacity-80">
                <li><Link href="/plans" className="hover:opacity-100">Planos</Link></li>
                <li><Link href="/auth/register" className="hover:opacity-100">Criar conta</Link></li>
                <li><Link href="/auth/login" className="hover:opacity-100">Entrar</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="mb-4 font-semibold">Recursos</h3>
              <ul className="space-y-2 text-sm opacity-80">
                <li><a href="#" className="hover:opacity-100">Blog</a></li>
                <li><a href="#" className="hover:opacity-100">FAQ</a></li>
                <li><a href="#" className="hover:opacity-100">Suporte</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="mb-4 font-semibold">Legal</h3>
              <ul className="space-y-2 text-sm opacity-80">
                <li><a href="#" className="hover:opacity-100">Termos de uso</a></li>
                <li><a href="#" className="hover:opacity-100">Privacidade</a></li>
                <li><a href="#" className="hover:opacity-100">Cookies</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 border-t border-accent-foreground/10 pt-8 text-center text-sm opacity-80">
            <p>&copy; 2025 SintoniaMed. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
