// User roles
export type UserRole = 'aluno' | 'admin_master' | 'admin_questoes'

// User profile with role information
export interface UserProfile {
  name: string
  email: string
  period: string
  institution: string
  photoURL?: string
  theme?: 'light' | 'dark'
  plan: 'monthly' | 'semester' | 'lifetime' | null
  planExpiresAt: Date | null
  createdAt: Date
  role: UserRole // Role stored in Firestore document
}

// Question types
export interface Question {
  id: string
  enunciado: string
  imagemUrl?: string // URL da imagem associada ao enunciado
  alternativaA: string
  alternativaB: string
  alternativaC: string
  alternativaD: string
  alternativaE: string
  alternativaCorreta: 'A' | 'B' | 'C' | 'D' | 'E'
  comentarioGabarito: string // Gabarito comentado (premium)
  area: string // Sistema (renomeado de área médica)
  subarea: string // Matéria (subdivisão dentro do sistema)
  disciplina?: string // SOI, HAM, IESC, CI
  dificuldade: 'facil' | 'medio' | 'dificil'
  tipo?: string // Mantido para compatibilidade com questões antigas
  period?: string // Novo campo: período da questão
  createdBy?: string // ID do usuário que criou a questão
  createdByName?: string // Nome do criador (para exibição)
  createdByPhotoURL?: string // Foto do criador (para exibição)
  oficial: boolean
  ativo: boolean
  createdAt: Date
  updatedAt: Date
}

// Report types
export interface Report {
  id: string
  questionId: string | null // Permite null para bugs gerais
  userId: string
  userName: string
  userEmail: string
  texto: string
  tipos?: string[]
  imagemUrl?: string
  status: 'pendente' | 'resolvido'
  createdAt: Date
  updatedAt?: Date
  resolvedAt?: Date
  resolvedBy?: string
  questionText?: string // Para exibição na lista
}

// Subscription types
export interface Subscription {
  userId: string
  plan: 'monthly' | 'semester'
  status: 'active' | 'expired' | 'cancelled'
  startDate: Date
  expiresAt: Date
  manuallyGranted: boolean
}

// Sistema types (renomeado de MedicalArea)
export interface Sistema {
  id: string
  nome: string
  descricao?: string
  periodo: string // Período do sistema (obrigatório)
  ativo: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string
  materias?: Materia[] // Subdivisões dentro do sistema
}

// Materia types (subdivisões dentro dos sistemas)
export interface Materia {
  id: string
  nome: string
  sistemaId: string
  ativo: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

// Mantido para compatibilidade com código antigo (deprecated)
export type MedicalArea = Sistema
