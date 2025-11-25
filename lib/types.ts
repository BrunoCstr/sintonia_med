// User roles
export type UserRole = 'aluno' | 'admin_master' | 'admin_questoes'

// User profile with role information
export interface UserProfile {
  name: string
  email: string
  period: string
  institution: string
  plan: 'monthly' | 'semester' | null
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
  area: string
  subarea: string
  dificuldade: 'facil' | 'medio' | 'dificil'
  tipo: string
  ativo: boolean
  createdAt: Date
  updatedAt: Date
}

// Report types
export interface Report {
  id: string
  questionId: string
  userId: string
  userName: string
  userEmail: string
  texto: string
  imagemUrl?: string
  status: 'pendente' | 'resolvido'
  createdAt: Date
  resolvedAt?: Date
  resolvedBy?: string
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

// Medical Area types
export interface MedicalArea {
  id: string
  nome: string
  descricao?: string
  ativo: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string
}
