'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { ArrowRight, Target, CheckCircle, Award, Brain, BookOpen, GraduationCap, Stethoscope, BarChart3, History, FileText, Users, ShieldCheck, ChevronDown, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useTheme } from '@/lib/theme-provider'
import { formatPrice } from '@/lib/utils'
import { AvailabilityNotice } from '@/components/availability-notice'

interface Plan {
  id: string
  name: string
  price: number
  originalPrice: number | null
  badge: string
  badgeVariant: string
  duration: string
  durationMonths: number
  recommended?: boolean
}

export default function WelcomePage() {
  const { user, loading } = useAuth()
  const { theme } = useTheme()
  const router = useRouter()
  const [monthlyPrice, setMonthlyPrice] = useState<number | null>(null)
  const [plansAvailable, setPlansAvailable] = useState(true)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  // Buscar preço do plano mensal do Firestore
  useEffect(() => {
    const fetchMonthlyPrice = async () => {
      try {
        const response = await fetch('/api/plans')
        const data = await response.json()
        if (data.success && data.plans && data.plans.length > 0) {
          const monthlyPlan = data.plans.find((plan: Plan) => plan.id === 'monthly')
          if (monthlyPlan) {
            setMonthlyPrice(monthlyPlan.price)
          } else {
            setPlansAvailable(false)
          }
        } else {
          setPlansAvailable(false)
        }
      } catch (error) {
        console.error('Erro ao buscar preços:', error)
        setPlansAvailable(false)
      }
    }
    fetchMonthlyPrice()
  }, [])

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
      <section className="relative flex min-h-screen items-center overflow-hidden px-4 py-12">
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
                <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-foreground lg:text-5xl">
                  Domine os temas essenciais estudando por questões no formato{' '}
                  <span className="relative inline-block">
                    <span className="relative z-10 text-primary">PBL.</span>
                    <span className="absolute bottom-2 left-0 h-3 w-full bg-primary/20" />
                  </span>
                  {' '} Prática que gera resultado.
                </h1>
                
                <div className="space-y-3">
                  <p className="text-pretty text-lg text-muted-foreground lg:text-xl">
                    O banco de questões independente, pensado para estudantes de medicina das instituições do grupo Afya.
                  </p>
                  <p className="text-pretty text-lg text-muted-foreground lg:text-xl">
                    Questões comentadas, simulados personalizados, análise de desempenho e gráficos de evolução.
                  </p>
                </div>
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
                className="flex items-center gap-8 pt-6"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span className="text-lg font-bold text-primary">5K+</span>
                  <span className="text-sm text-muted-foreground">questões</span>
                </div>

                <div className="h-4 w-px bg-border" />

                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Criadas por <span className="font-semibold text-foreground">Monitores e Professores</span>
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Right: Creative visual composition */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative flex min-h-[400px] flex-col items-center justify-center lg:min-h-[500px]"
            >
              {/* Floating decorative elements */}
              <motion.div
                animate={{ 
                  y: [0, -15, 0],
                  rotate: [0, 5, 0]
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute -left-4 top-8 rounded-2xl border border-primary/20 bg-card/80 p-4 shadow-lg backdrop-blur-sm lg:left-0"
              >
                <Brain className="h-8 w-8 text-primary" />
              </motion.div>

              <motion.div
                animate={{ 
                  y: [0, 12, 0],
                  rotate: [0, -5, 0]
                }}
                transition={{ 
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5
                }}
                className="absolute -right-4 top-16 rounded-2xl border border-primary/20 bg-card/80 p-4 shadow-lg backdrop-blur-sm lg:right-0"
              >
                <Stethoscope className="h-8 w-8 text-primary" />
              </motion.div>

              <motion.div
                animate={{ 
                  y: [0, 10, 0],
                  rotate: [0, -3, 0]
                }}
                transition={{ 
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1
                }}
                className="absolute -left-2 bottom-24 rounded-2xl border border-primary/20 bg-card/80 p-4 shadow-lg backdrop-blur-sm lg:left-4"
              >
                <BookOpen className="h-8 w-8 text-primary" />
              </motion.div>

              <motion.div
                animate={{ 
                  y: [0, -12, 0],
                  rotate: [0, 8, 0]
                }}
                transition={{ 
                  duration: 3.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.8
                }}
                className="absolute -right-2 bottom-32 rounded-2xl border border-primary/20 bg-card/80 p-4 shadow-lg backdrop-blur-sm lg:right-4"
              >
                <GraduationCap className="h-8 w-8 text-primary" />
              </motion.div>

              {/* Main content */}
              <div className="relative z-10 flex flex-col items-center space-y-8">
                {/* Glow effect behind logo */}
                <div className="absolute -inset-10 rounded-full bg-primary/10 blur-3xl" />
                
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="relative"
                >
                  <Image 
                    src={theme === 'light' ? "/logo-sintoniamed-light.png" : "/logo-sintoniamed-dark.png"} 
                    alt="SintoniaMed" 
                    width={420}
                    height={130}
                    className="relative z-10 h-auto w-full max-w-sm transition-transform hover:scale-105 lg:max-w-md"
                    priority
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  className="text-center"
                >
                  <h2 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
                    <span className="relative inline-block">
                      <span className="relative z-10">O seu</span>
                    </span>{' '}
                    <span className="relative inline-block">
                      <span className="relative z-10 text-primary">banco de questões</span>
                      <motion.span 
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.8, delay: 1.2 }}
                        className="absolute bottom-1 left-0 h-2 w-full origin-left bg-primary/20 lg:bottom-2 lg:h-3" 
                      />
                    </span>
                  </h2>
                </motion.div>
              </div>
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
              { icon: Target, title: 'Simulados Personalizados', description: 'Crie provas sob medida com filtros de período, matéria, dificuldade e quantidade. Modo cronometrado para simular o dia da prova.' },
              { icon: FileText, title: 'Gabarito Comentado', description: 'Todas as questões com explicações detalhadas. Entenda o raciocínio por trás de cada alternativa correta e incorreta.' },
              { icon: BarChart3, title: 'Dashboard Inteligente', description: 'Acompanhe seu progresso com gráficos detalhados. Identifique pontos fracos e otimize seus estudos com dados reais.' },
              { icon: History, title: 'Histórico Completo', description: 'Revise todos os seus simulados anteriores em detalhes. Compare seu desempenho entre diferentes períodos, matérias e dificuldades. Veja sua evolução ao longo do tempo através de gráficos interativos e estatísticas precisas. Identifique padrões de acertos e erros para otimizar sua estratégia de estudos.' },
              { icon: BookOpen, title: 'Questões Revisadas', description: 'Banco de dados extenso construído com rigor acadêmico e revisado minuciosamente por monitores experientes e professores qualificados. Cada questão passa por um processo de validação rigoroso para assegurar confiabilidade, consistência pedagógica e alinhamento com os padrões acadêmicos das instituições Afya.' },
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
                <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-4 transition-colors group-hover:bg-primary">
                  <feature.icon className="h-8 w-8 text-primary transition-colors group-hover:text-primary-foreground" />
                </div>
                <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
            
            {/* Availability Notice - Card no mesmo tamanho dos outros */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <AvailabilityNotice />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 py-20">
        {/* Decorative background elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-20 h-[400px] w-[400px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute right-1/4 bottom-20 h-[300px] w-[300px] rounded-full bg-secondary/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 5, -5, 0],
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <HelpCircle className="h-10 w-10 text-primary" />
              </motion.div>
            </motion.div>
            <h2 className="mb-4 text-balance text-4xl font-bold lg:text-5xl">
              Perguntas frequentes
            </h2>
            <p className="text-lg text-muted-foreground">
              Tudo o que você precisa saber sobre o SintoniaMed
            </p>
          </motion.div>
          
          <div className="mx-auto max-w-4xl space-y-4">
            {[
              {
                question: 'Quantas questões existem por período no site?',
                answer: 'No momento temos em torno de mil questões por período no site. Mas o SintoniaMed tem um sistema que prevê a adição de novas questões periódicamente, dessa forma nosso banco estará sempre crescendo.'
              },
              {
                question: 'Eu encontro as questões de provas da Afya?',
                answer: 'Sim, você irá encontrar questões baseadas nas questões das nacionais anteriores da Afya, de todos os períodos que estão disponíveis no site. As questões tem algumas alterações de grafia e de diagramação, mas tem a mesma idéia e raciocínio das questões originais, teste e verá.'
              },
              {
                question: 'Como são feitas as questões do site?',
                answer: 'As questões do SintoniaMed são feitas uma a uma por monitores e professores com mais de 2 anos de experiência com as provas da matriz Afya. Embora não tenhamos nenhum vínculo com a instituição, somos veteranos do curso e já fizemos as provas centenas de vezes, tanto em aula quanto em off. Dessa forma, as questões autorais do site são produzidas visando o modelo de questões que você encontrará na sua prova, tudo para seu estudo ser o mais efetivo possível.'
              },
              {
                question: 'É usado IA para fazer as questões do site?',
                answer: 'Sim, usamos IA para diagramar e deixar as questões e gabaritos num formato padrão. Mas todas as questões e gabaritos são de autoria de um monitor ou professor. A IA é usada para diagramar e padronizar as questões em escala. Em outras palavras, cada questão é revisada individualmente por um humano, o que torna a experiência do SintoniaMed única no segmento.'
              },
              {
                question: 'Como é feito o pagamento? É seguro?',
                answer: 'O pagamento é feito via Mercado Pago. O SintoniaMed não armazena nenhum dado sensível dos usuários, todo o processo de pagamento é feito via API do Mercado Pago, maximizando a segurança dos dados e levando mais credibilidade na hora da compra.'
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ 
                  duration: 0.5, 
                  delay: index * 0.08,
                  ease: [0.25, 0.4, 0.25, 1]
                }}
              >
                <motion.button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="group w-full overflow-hidden rounded-xl border bg-card/50 backdrop-blur-sm text-left transition-all hover:border-primary/50 hover:bg-card hover:shadow-lg hover:shadow-primary/5"
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between gap-4 p-6">
                    <div className="flex items-center gap-4 flex-1">
                      <motion.div
                        initial={{ scale: 1 }}
                        animate={{ scale: openFaqIndex === index ? 1.1 : 1 }}
                        transition={{ duration: 0.2 }}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      >
                        {index + 1}
                      </motion.div>
                      <h3 className="flex-1 font-semibold text-foreground text-lg">
                        {faq.question}
                      </h3>
                    </div>
                    <motion.div
                      animate={{ rotate: openFaqIndex === index ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="shrink-0"
                    >
                      <ChevronDown className="h-5 w-5 text-primary" />
                    </motion.div>
                  </div>
                  <motion.div
                    initial={false}
                    animate={{
                      height: openFaqIndex === index ? "auto" : 0,
                      opacity: openFaqIndex === index ? 1 : 0
                    }}
                    transition={{ 
                      height: { duration: 0.3, ease: "easeInOut" },
                      opacity: { duration: 0.2, ease: "easeInOut" }
                    }}
                    className="overflow-hidden"
                  >
                    <motion.div
                      initial={{ y: -10 }}
                      animate={{ y: openFaqIndex === index ? 0 : -10 }}
                      transition={{ duration: 0.3 }}
                      className="border-t bg-background/50 px-6 pb-6 pt-4"
                    >
                      <p className="text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  </motion.div>
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y bg-card px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-12 lg:p-16">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="space-y-6">
                <h2 className="text-balance text-3xl font-bold lg:text-4xl">
                  Comece agora mesmo a treinar com o método de estudo ativo.
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-1 h-6 w-6 shrink-0 text-success" />
                    <div>
                      <div className="font-semibold text-foreground">Planos acessíveis</div>
                      <div className="text-sm text-muted-foreground">
                        {monthlyPrice !== null 
                          ? `A partir de R$ ${formatPrice(monthlyPrice)}/mês com acesso completo`
                          : plansAvailable 
                          ? 'Carregando preços...' 
                          : 'Consulte nossos planos'}
                      </div>
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
                  <div className="text-sm font-medium text-muted-foreground">
                    {monthlyPrice !== null ? 'Oferta especial' : 'Planos disponíveis'}
                  </div>
                  <div className="text-4xl font-bold text-foreground">
                    {monthlyPrice !== null 
                      ? <>R$ {formatPrice(monthlyPrice)}<span className="text-xl font-normal text-muted-foreground">/mês</span></>
                      : plansAvailable 
                      ? <span className="text-2xl">Carregando...</span>
                      : <span className="text-2xl">Consulte planos</span>}
                  </div>
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
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 text-primary" />
                  <span>Pagamento seguro via MercadoPago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-6 py-3 text-sm font-medium text-primary">
            <Award className="h-5 w-5" />
            Teste agora o banco de questões com o Plano Free
          </div>
          
          <h2 className="mb-6 text-balance text-4xl font-bold lg:text-5xl">
            Comece a estudar com o SintoniaMed hoje mesmo
          </h2>
          
          <p className="mb-8 text-lg text-muted-foreground">
          O seu estudo turbinado começa agora!
          </p>
          
          <Button asChild size="lg" className="gap-2 text-lg shadow-lg shadow-primary/20">
            <Link href="/auth/register">
              Criar minha conta grátis
              <ArrowRight className="h-6 w-6" />
            </Link>
          </Button>
          
          <p className="mt-4 text-sm text-muted-foreground">
           Sem fidelidade ou renovação automática, cancele quando desejar
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-accent px-4 py-12 text-accent-foreground">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-4">
              <Image 
                src="/logo-sintoniamed-dark.png"
                alt="SintoniaMed" 
                width={300}
                height={90}
                className="h-16 w-auto lg:h-20"
              />
              <p className="text-sm opacity-80">
                A plataforma que vai te garantir uma aprovação tranquila no semestre.
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
          
          <div className="mt-12 border-t border-accent-foreground/10 pt-8 space-y-4">
            <p className="text-center text-xs opacity-70 leading-relaxed max-w-4xl mx-auto">
              Este site é uma plataforma independente, sem qualquer vínculo, parceria, autorização ou associação com a Afya ou com qualquer uma de suas instituições. Não utilizamos materiais oficiais, internos ou de propriedade intelectual da Afya.
            </p>
            <p className="text-center text-sm opacity-80">
              &copy; 2025 SintoniaMed. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
