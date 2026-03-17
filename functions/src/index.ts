import * as functions from 'firebase-functions/v2'
import * as admin from 'firebase-admin'
import * as ExcelJS from 'exceljs'
import * as nodemailer from 'nodemailer'

// Inicializar Firebase Admin
admin.initializeApp()

// Interface para os dados da questão
interface QuestionData {
  id: string
  enunciado: string
  imagemUrl?: string
  alternativaA: string
  alternativaB: string
  alternativaC: string
  alternativaD: string
  alternativaE: string
  alternativaCorreta: 'A' | 'B' | 'C' | 'D' | 'E'
  comentarioGabarito: string
  area: string
  subarea: string
  disciplina?: string
  dificuldade: 'facil' | 'medio' | 'dificil'
  tipo?: string
  period?: string
  createdBy?: string
  createdByName?: string
  createdByPhotoURL?: string
  oficial: boolean
  ativo: boolean
  createdAt: any
  updatedAt: any
}

/**
 * Converte timestamp do Firestore para string formatada
 */
function formatDate(timestamp: any): string {
  if (!timestamp) return ''
  if (timestamp.toDate) {
    return timestamp.toDate().toLocaleString('pt-BR')
  }
  if (timestamp instanceof Date) {
    return timestamp.toLocaleString('pt-BR')
  }
  return String(timestamp)
}

/**
 * Cria um arquivo Excel com os dados das questões
 */
async function createExcelFile(questions: QuestionData[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Questões')

  // Definir cabeçalhos
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 30 },
    { header: 'Enunciado', key: 'enunciado', width: 50 },
    { header: 'Imagem URL', key: 'imagemUrl', width: 40 },
    { header: 'Alternativa A', key: 'alternativaA', width: 40 },
    { header: 'Alternativa B', key: 'alternativaB', width: 40 },
    { header: 'Alternativa C', key: 'alternativaC', width: 40 },
    { header: 'Alternativa D', key: 'alternativaD', width: 40 },
    { header: 'Alternativa E', key: 'alternativaE', width: 40 },
    { header: 'Alternativa Correta', key: 'alternativaCorreta', width: 20 },
    { header: 'Comentário Gabarito', key: 'comentarioGabarito', width: 50 },
    { header: 'Área', key: 'area', width: 30 },
    { header: 'Subárea', key: 'subarea', width: 30 },
    { header: 'Disciplina', key: 'disciplina', width: 20 },
    { header: 'Dificuldade', key: 'dificuldade', width: 15 },
    { header: 'Tipo', key: 'tipo', width: 20 },
    { header: 'Período', key: 'period', width: 15 },
    { header: 'Criado Por (ID)', key: 'createdBy', width: 30 },
    { header: 'Criado Por (Nome)', key: 'createdByName', width: 30 },
    { header: 'Oficial', key: 'oficial', width: 10 },
    { header: 'Ativo', key: 'ativo', width: 10 },
    { header: 'Data de Criação', key: 'createdAt', width: 25 },
    { header: 'Data de Atualização', key: 'updatedAt', width: 25 },
  ]

  // Estilizar cabeçalhos
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  }

  // Adicionar dados
  questions.forEach((question) => {
    worksheet.addRow({
      id: question.id,
      enunciado: question.enunciado || '',
      imagemUrl: question.imagemUrl || '',
      alternativaA: question.alternativaA || '',
      alternativaB: question.alternativaB || '',
      alternativaC: question.alternativaC || '',
      alternativaD: question.alternativaD || '',
      alternativaE: question.alternativaE || '',
      alternativaCorreta: question.alternativaCorreta || '',
      comentarioGabarito: question.comentarioGabarito || '',
      area: question.area || '',
      subarea: question.subarea || '',
      disciplina: question.disciplina || '',
      dificuldade: question.dificuldade || '',
      tipo: question.tipo || '',
      period: question.period || '',
      createdBy: question.createdBy || '',
      createdByName: question.createdByName || '',
      oficial: question.oficial ? 'Sim' : 'Não',
      ativo: question.ativo ? 'Sim' : 'Não',
      createdAt: formatDate(question.createdAt),
      updatedAt: formatDate(question.updatedAt),
    })
  })

  // Ajustar altura das linhas
  worksheet.eachRow((row) => {
    row.height = 20
  })

  // Gerar buffer do arquivo
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/**
 * Faz upload do arquivo para o Firebase Storage
 */
async function uploadToFirebaseStorage(
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  const storage = admin.storage()
  
  // Tentar obter bucket name do app do Firebase Admin primeiro
  let bucketName = admin.app().options.storageBucket
  
  // Se não estiver no app, tentar variável de ambiente
  if (!bucketName) {
    bucketName = process.env.FIREBASE_STORAGE_BUCKET
  }
  
  // Se ainda não tiver, usar o padrão do projeto conhecido
  if (!bucketName) {
    // No Firebase Functions, usar o project ID conhecido
    const projectId = process.env.GCLOUD_PROJECT || 'sintoniamed-72585'
    bucketName = `${projectId}.appspot.com`
  }

  // Definir o caminho do arquivo na pasta de backups
  const filePath = `backups/${fileName}`
  
  const bucket = storage.bucket(bucketName)
  const fileRef = bucket.file(filePath)

  // Fazer upload do arquivo e torná-lo público
  await fileRef.save(fileBuffer, {
    metadata: {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
    public: true, // Tornar o arquivo público
  })

  // Tornar o arquivo público para acesso direto
  await fileRef.makePublic()

  // Gerar URL pública direta (não expira)
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${filePath}`

  console.log(`📤 Arquivo enviado para o Firebase Storage: ${filePath}`)
  console.log(`🔗 URL pública: ${publicUrl}`)
  
  return publicUrl
}

/**
 * Envia email com o link do backup para o cliente
 */
async function sendBackupEmail(
  fileName: string,
  downloadUrl: string,
  questionsCount: number,
  emailUser: string,
  emailPassword: string,
  clientEmail: string
): Promise<void> {
  console.log('')
  console.log('═══════════════════════════════════════════════════════')
  console.log('📧 [sendBackupEmail] INICIANDO ENVIO DE EMAIL')
  console.log('═══════════════════════════════════════════════════════')
  
  // ========== VALIDAÇÃO DOS PARÂMETROS ==========
  console.log('')
  console.log('[sendBackupEmail] PASSO 1: Validando parâmetros...')
  console.log(`   fileName: ${fileName}`)
  console.log(`   downloadUrl: ${downloadUrl}`)
  console.log(`   questionsCount: ${questionsCount}`)
  
  // Validar e limpar emailUser
  if (!emailUser) {
    console.error(`   ❌ EMAIL_USER está vazio!`)
    throw new Error('EMAIL_USER não configurado. Configure usando: firebase functions:secrets:set EMAIL_USER')
  }
  
  // Limpar espaços e caracteres invisíveis do email
  emailUser = emailUser.trim()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(emailUser)) {
    console.error(`   ❌ EMAIL_USER tem formato inválido: ${emailUser.substring(0, 5)}***`)
    throw new Error(`EMAIL_USER tem formato inválido. Verifique se é um email válido.`)
  }
  
  console.log(`   ✅ EMAIL_USER: ${emailUser.substring(0, 3)}***${emailUser.substring(emailUser.indexOf('@'))} (${emailUser.length} caracteres)`)
  
  // Validar e limpar emailPassword
  if (!emailPassword) {
    console.error(`❌ EMAIL_PASSWORD está vazio!`)
    throw new Error('EMAIL_PASSWORD não configurado. Configure usando: firebase functions:secrets:set EMAIL_PASSWORD')
  }
  
  // Limpar espaços em branco da senha (comum ao copiar/colar)
  const originalPasswordLength = emailPassword.length
  emailPassword = emailPassword.trim()
  const passwordHasSpaces = emailPassword.includes(' ')
  
  console.log(`   ✅ EMAIL_PASSWORD: ${emailPassword.length > 0 ? '***CONFIGURADO***' : '❌ VAZIO'}`)
  console.log(`   Comprimento original: ${originalPasswordLength} caracteres`)
  console.log(`   Comprimento após trim: ${emailPassword.length} caracteres`)
  console.log(`   Contém espaços: ${passwordHasSpaces ? '⚠️ SIM (será removido)' : '✅ NÃO'}`)
  
  // Remover todos os espaços da senha se houver
  if (passwordHasSpaces) {
    const beforeClean = emailPassword.length
    emailPassword = emailPassword.replace(/\s/g, '')
    console.log(`   ⚠️ Espaços removidos da senha: ${beforeClean} → ${emailPassword.length} caracteres`)
  }
  
  // Validar comprimento da senha de aplicativo (deve ser 16 caracteres)
  if (emailPassword.length !== 16) {
    console.warn(`   ⚠️ ATENÇÃO: Senha tem ${emailPassword.length} caracteres. Senhas de aplicativo do Gmail devem ter 16 caracteres.`)
    console.warn(`   Se você está usando senha de aplicativo, verifique se copiou todos os 16 caracteres.`)
  } else {
    console.log(`   ✅ Senha tem 16 caracteres (tamanho esperado para senha de aplicativo)`)
  }
  
  // Verificar caracteres especiais ou problemas na senha
  console.log(`   Primeiros 4 caracteres: "${emailPassword.substring(0, 4)}"`)
  console.log(`   Últimos 4 caracteres: "${emailPassword.substring(emailPassword.length - 4)}"`)
  console.log(`   Contém apenas letras minúsculas e números: ${/^[a-z0-9]+$/.test(emailPassword) ? '✅ SIM' : '⚠️ NÃO (pode ter caracteres especiais)'}`)
  console.log(`   Contém caracteres não-ASCII: ${/[^\x00-\x7F]/.test(emailPassword) ? '⚠️ SIM' : '✅ NÃO'}`)
  
  // Mostrar senha mascarada para debug (primeiros 4 + últimos 4)
  const maskedPassword = emailPassword.length >= 8 
    ? `${emailPassword.substring(0, 4)}${'*'.repeat(emailPassword.length - 8)}${emailPassword.substring(emailPassword.length - 4)}`
    : '*'.repeat(emailPassword.length)
  console.log(`   Senha (mascarada): ${maskedPassword}`)
  
  // Validar clientEmail
  if (!clientEmail) {
    console.error(`   ❌ CLIENT_EMAIL está vazio!`)
    throw new Error('CLIENT_EMAIL não configurado. Configure usando: firebase functions:secrets:set CLIENT_EMAIL')
  }
  
  clientEmail = clientEmail.trim()
  if (!emailRegex.test(clientEmail)) {
    console.error(`   ❌ CLIENT_EMAIL tem formato inválido: ${clientEmail}`)
    throw new Error(`CLIENT_EMAIL tem formato inválido. Verifique se é um email válido.`)
  }
  
  console.log(`   ✅ CLIENT_EMAIL: ${clientEmail}`)
  console.log('   ✅ Todos os parâmetros estão presentes e validados')

  // ========== CRIAÇÃO DO TRANSPORTER ==========
  console.log('')
  console.log('[sendBackupEmail] PASSO 2: Criando transporter do nodemailer...')
  console.log(`   Email remetente: ${emailUser}`)
  console.log(`   Comprimento da senha: ${emailPassword.length} caracteres`)
  
  // Verificação final antes de criar o transporter
  console.log('')
  console.log('   📋 VERIFICAÇÃO FINAL ANTES DE AUTENTICAR:')
  console.log(`   ✅ Email: ${emailUser}`)
  console.log(`   ✅ Senha tem ${emailPassword.length} caracteres`)
  console.log(`   ✅ Senha limpa (sem espaços): ${emailPassword.replace(/\s/g, '').length === emailPassword.length ? 'SIM' : 'NÃO'}`)
  
  // Verificar se a senha parece ser uma senha de aplicativo válida
  if (emailPassword.length === 16 && /^[a-z0-9]+$/.test(emailPassword)) {
    console.log(`   ✅ Senha parece ser uma senha de aplicativo válida (16 caracteres, apenas letras minúsculas e números)`)
  } else if (emailPassword.length === 16) {
    console.warn(`   ⚠️ Senha tem 16 caracteres mas contém caracteres especiais ou maiúsculas`)
    console.warn(`   Senhas de aplicativo do Gmail geralmente são apenas letras minúsculas e números`)
  }
  
  let transporter: nodemailer.Transporter
  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser.trim(), // Garantir que não há espaços
        pass: emailPassword.trim().replace(/\s/g, ''), // Remover todos os espaços
      },
      debug: true, // Ativar debug do nodemailer
      logger: true, // Ativar logger do nodemailer
    })
    console.log('   ✅ Transporter criado com sucesso')
    console.log(`   Configuração: service=gmail`)
    console.log(`   User: ${emailUser}`)
    console.log(`   Password length: ${emailPassword.length} caracteres`)
  } catch (transporterError: any) {
    console.error(`   ❌ ERRO ao criar transporter: ${transporterError.message}`)
    console.error(`   Stack: ${transporterError.stack}`)
    throw new Error(`Falha ao criar transporter do nodemailer: ${transporterError.message}`)
  }

  // ========== PREPARAÇÃO DO EMAIL ==========
  console.log('')
  console.log('[sendBackupEmail] PASSO 3: Preparando conteúdo do email...')
  
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR')
  
  const mailOptions = {
    from: `"Sintonia Med - Backup" <${emailUser}>`,
    to: clientEmail,
    subject: `📊 Backup Semanal das Questões - ${dateStr}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .download-btn { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .download-btn:hover { background: #5a6fd6; }
          .footer { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
          .stat { display: inline-block; margin: 10px 20px; text-align: center; }
          .stat-number { font-size: 32px; font-weight: bold; color: #667eea; }
          .stat-label { font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Backup Semanal</h1>
            <p>Sintonia Med - Questões</p>
          </div>
          <div class="content">
            <p>Olá!</p>
            <p>O backup semanal das questões foi realizado com sucesso.</p>
            
            <div class="info-box">
              <div class="stat">
                <div class="stat-number">${questionsCount}</div>
                <div class="stat-label">Questões</div>
              </div>
              <div class="stat">
                <div class="stat-number">${dateStr}</div>
                <div class="stat-label">Data</div>
              </div>
            </div>

            <p><strong>📁 Arquivo:</strong> ${fileName}</p>
            
            <p style="text-align: center;">
              <a href="${downloadUrl}" class="download-btn">⬇️ Baixar Backup</a>
            </p>
            
            <p style="color: #888; font-size: 14px;">
              💾 <strong>Dica:</strong> Faça o download e salve o arquivo em um local seguro para manter seu backup.
            </p>
          </div>
          <div class="footer">
            <p>Este é um email automático do sistema Sintonia Med.</p>
            <p>© ${now.getFullYear()} Sintonia Med - Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }
  
  console.log(`   De: ${mailOptions.from}`)
  console.log(`   Para: ${mailOptions.to}`)
  console.log(`   Assunto: ${mailOptions.subject}`)
  console.log(`   Tamanho do HTML: ${mailOptions.html.length} caracteres`)
  console.log('   ✅ Conteúdo do email preparado')

  // ========== VERIFICAÇÃO DA CONEXÃO SMTP ==========
  console.log('')
  console.log('[sendBackupEmail] PASSO 4: Verificando conexão SMTP...')
  try {
    const verifyResult = await transporter.verify()
    console.log('   ✅ Conexão SMTP verificada com sucesso!')
    console.log(`   Resultado da verificação: ${JSON.stringify(verifyResult)}`)
  } catch (verifyError: any) {
    console.error('')
    console.error('   ❌❌❌ ERRO NA VERIFICAÇÃO SMTP ❌❌❌')
    console.error(`   Mensagem: ${verifyError.message}`)
    console.error(`   Código: ${verifyError.code || 'N/A'}`)
    console.error(`   Command: ${verifyError.command || 'N/A'}`)
    
    const errorMessage = verifyError.message || ''
    
    // Verificar se é erro de credenciais inválidas (BadCredentials)
    if (errorMessage.includes('BadCredentials') || 
        errorMessage.includes('Username and Password not accepted')) {
      console.error('')
      console.error('   ⚠️⚠️⚠️ PROBLEMA IDENTIFICADO: CREDENCIAIS INVÁLIDAS ⚠️⚠️⚠️')
      console.error('')
      console.error('   O Gmail está rejeitando o email ou senha fornecidos.')
      console.error('')
      console.error('   📋 VERIFICAÇÕES NECESSÁRIAS:')
      console.error('')
      console.error('   1️⃣ Verifique se o EMAIL_USER está correto:')
      console.error(`      → Email usado: ${emailUser}`)
      console.error('      → Execute: firebase functions:secrets:access EMAIL_USER')
      console.error('      → Confirme que o email está correto e completo')
      console.error('')
      console.error('   2️⃣ Verifique se está usando SENHA DE APLICATIVO (não senha normal):')
      console.error('      → A senha de aplicativo tem 16 caracteres (sem espaços)')
      console.error(`      → Comprimento atual da senha: ${emailPassword.length} caracteres`)
      console.error(`      → Primeiros 4 caracteres recebidos: "${emailPassword.substring(0, 4)}"`)
      console.error(`      → Últimos 4 caracteres recebidos: "${emailPassword.substring(emailPassword.length - 4)}"`)
      console.error('      → Execute: firebase functions:secrets:access EMAIL_PASSWORD')
      console.error('      → Confirme que copiou TODOS os 16 caracteres')
      console.error('      → Verifique se não há espaços antes ou depois')
      console.error('      → A senha deve ser APENAS letras minúsculas e números (sem espaços, sem hífens)')
      console.error('')
      console.error('   3️⃣ VERIFIQUE SE A VERIFICAÇÃO EM DUAS ETAPAS ESTÁ ATIVADA:')
      console.error('      → Acesse: https://myaccount.google.com/security')
      console.error('      → Procure por "Verificação em duas etapas"')
      console.error('      → DEVE estar ATIVADA (obrigatório para senhas de aplicativo)')
      console.error('      → Se não estiver ativada, ATIVE PRIMEIRO antes de gerar senha de app')
      console.error('')
      console.error('   4️⃣ Se ainda não tem senha de aplicativo OU se a atual não funciona, gere uma NOVA:')
      console.error('      → Acesse: https://myaccount.google.com/apppasswords')
      console.error('      → Selecione "Email" como aplicativo')
      console.error('      → Selecione "Outro (nome personalizado)" como dispositivo')
      console.error('      → Digite "Sintonia Med Backup" e gere')
      console.error('      → IMPORTANTE: Copie os 16 caracteres EXATAMENTE como aparecem')
      console.error('      → Se aparecer com espaços (ex: "abcd efgh ijkl mnop"), remova os espaços')
      console.error('      → Use apenas: "abcdefghijklmnop" (sem espaços, sem hífens)')
      console.error('')
      console.error('   5️⃣ Atualize o secret EMAIL_PASSWORD:')
      console.error('      firebase functions:secrets:set EMAIL_PASSWORD')
      console.error('      → Quando solicitado, cole APENAS os 16 caracteres')
      console.error('      → NÃO cole espaços, NÃO cole hífens')
      console.error('      → Exemplo correto: nqcplopamciwnrlv')
      console.error('      → Exemplo ERRADO: nqcp lop amci wnrlv (com espaços)')
      console.error('')
      console.error('   6️⃣ Aguarde alguns minutos após atualizar o secret')
      console.error('      → O Firebase pode levar alguns minutos para propagar')
      console.error('      → Tente novamente após 2-3 minutos')
      console.error('')
      console.error('   7️⃣ Se ainda não funcionar, verifique:')
      console.error('      → A conta do Gmail está ativa e funcionando?')
      console.error('      → Você consegue fazer login normalmente no Gmail?')
      console.error('      → A senha de aplicativo foi gerada para o email correto?')
      console.error('      → Tente gerar uma NOVA senha de aplicativo (delete a antiga e gere nova)')
      console.error('')
      console.error(`   Stack: ${verifyError.stack}`)
      
      throw new Error(
        'Credenciais inválidas. Verifique se: ' +
        '(1) EMAIL_USER está correto, ' +
        '(2) está usando senha de aplicativo de 16 caracteres (não senha normal), ' +
        '(3) copiou todos os caracteres sem espaços. ' +
        'Gere senha de app em: https://myaccount.google.com/apppasswords'
      )
    }
    
    // Verificar se é erro de senha de aplicativo específica
    if (errorMessage.includes('Application-specific password required') || 
        errorMessage.includes('InvalidSecondFactor')) {
      console.error('')
      console.error('   ⚠️⚠️⚠️ PROBLEMA IDENTIFICADO: SENHA DE APLICATIVO NECESSÁRIA ⚠️⚠️⚠️')
      console.error('')
      console.error('   O Gmail está exigindo uma SENHA DE APLICATIVO (App Password) em vez da senha normal.')
      console.error('')
      console.error('   📋 PASSO A PASSO PARA RESOLVER:')
      console.error('')
      console.error('   1️⃣ Ative a Verificação em Duas Etapas no Gmail:')
      console.error('      → Acesse: https://myaccount.google.com/security')
      console.error('      → Ative "Verificação em duas etapas"')
      console.error('')
      console.error('   2️⃣ Gere uma Senha de Aplicativo:')
      console.error('      → Acesse: https://myaccount.google.com/apppasswords')
      console.error('      → Selecione "Email" como aplicativo')
      console.error('      → Selecione "Outro (nome personalizado)" como dispositivo')
      console.error('      → Digite um nome (ex: "Sintonia Med Backup")')
      console.error('      → Clique em "Gerar"')
      console.error('')
      console.error('   3️⃣ Copie a senha gerada (16 caracteres, sem espaços)')
      console.error('')
      console.error('   4️⃣ Configure o secret EMAIL_PASSWORD com a senha de aplicativo:')
      console.error('      firebase functions:secrets:set EMAIL_PASSWORD')
      console.error('      (Cole a senha de 16 caracteres quando solicitado)')
      console.error('')
      console.error('   ⚠️ IMPORTANTE: Use a SENHA DE APLICATIVO (16 caracteres), NÃO a senha normal do Gmail!')
      console.error('')
      console.error(`   Stack: ${verifyError.stack}`)
      
      throw new Error(
        'Gmail requer senha de aplicativo. ' +
        'Ative a verificação em duas etapas e gere uma senha de aplicativo em ' +
        'https://myaccount.google.com/apppasswords. ' +
        'Depois configure o secret EMAIL_PASSWORD com a senha de aplicativo gerada.'
      )
    }
    
    // Verificar outros tipos de erro de autenticação
    if (errorMessage.includes('Invalid login') || errorMessage.includes('authentication')) {
      console.error('')
      console.error('   ⚠️ PROBLEMA DE AUTENTICAÇÃO detectado')
      console.error('   Verifique se:')
      console.error('      1. O email e senha estão corretos')
      console.error('      2. A senha de app está sendo usada (não a senha normal)')
      console.error('      3. A verificação em duas etapas está ativada no Gmail')
      console.error('      4. Uma senha de app foi gerada em: https://myaccount.google.com/apppasswords')
    }
    
    // Verificar erro de quota
    if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
      console.error('   ⚠️ ERRO DE QUOTA/RATE LIMIT detectado')
      console.error('   Aguarde alguns minutos e tente novamente')
    }
    
    // Verificar erro de timeout
    if (errorMessage.includes('timeout')) {
      console.error('   ⚠️ ERRO DE TIMEOUT detectado')
      console.error('   Verifique sua conexão com a internet')
    }
    
    console.error(`   Stack completo: ${verifyError.stack}`)
    throw new Error(`Falha na autenticação SMTP: ${verifyError.message}`)
  }

  // ========== ENVIO DO EMAIL ==========
  console.log('')
  console.log('[sendBackupEmail] PASSO 5: Enviando email...')
  console.log(`   Tentando enviar de ${emailUser} para ${clientEmail}...`)
  
  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('')
    console.log('   ✅✅✅ EMAIL ENVIADO COM SUCESSO! ✅✅✅')
    console.log(`   Message ID: ${info.messageId || 'N/A'}`)
    console.log(`   Response: ${info.response || 'N/A'}`)
    console.log(`   Accepted: ${info.accepted?.join(', ') || 'N/A'}`)
    console.log(`   Rejected: ${info.rejected?.join(', ') || 'Nenhum'}`)
    console.log(`   Pending: ${info.pending?.join(', ') || 'Nenhum'}`)
    console.log(`📧 Email enviado com sucesso para: ${clientEmail}`)
    console.log('')
    console.log('═══════════════════════════════════════════════════════')
    console.log('✅ [sendBackupEmail] PROCESSO CONCLUÍDO COM SUCESSO')
    console.log('═══════════════════════════════════════════════════════')
  } catch (sendError: any) {
    console.error('')
    console.error('   ❌❌❌ ERRO AO ENVIAR EMAIL ❌❌❌')
    console.error(`   Mensagem: ${sendError.message}`)
    console.error(`   Código: ${sendError.code || 'N/A'}`)
    console.error(`   Command: ${sendError.command || 'N/A'}`)
    console.error(`   Response: ${sendError.response || 'N/A'}`)
    console.error(`   ResponseCode: ${sendError.responseCode || 'N/A'}`)
    
    const errorMessage = sendError.message || ''
    
    // Verificar se é erro de credenciais inválidas (BadCredentials)
    if (errorMessage.includes('BadCredentials') || 
        errorMessage.includes('Username and Password not accepted')) {
      console.error('')
      console.error('   ⚠️⚠️⚠️ PROBLEMA IDENTIFICADO: CREDENCIAIS INVÁLIDAS ⚠️⚠️⚠️')
      console.error('')
      console.error('   O Gmail está rejeitando o email ou senha fornecidos.')
      console.error('')
      console.error('   📋 VERIFICAÇÕES NECESSÁRIAS:')
      console.error('')
      console.error('   1️⃣ Verifique se o EMAIL_USER está correto:')
      console.error(`      → Email usado: ${emailUser}`)
      console.error('      → Execute: firebase functions:secrets:access EMAIL_USER')
      console.error('      → Confirme que o email está correto e completo')
      console.error('')
      console.error('   2️⃣ Verifique se está usando SENHA DE APLICATIVO (não senha normal):')
      console.error('      → A senha de aplicativo tem 16 caracteres (sem espaços)')
      console.error(`      → Comprimento atual da senha: ${emailPassword.length} caracteres`)
      console.error('      → Execute: firebase functions:secrets:access EMAIL_PASSWORD')
      console.error('      → Confirme que copiou TODOS os 16 caracteres')
      console.error('      → Verifique se não há espaços antes ou depois')
      console.error('')
      console.error('   3️⃣ Se ainda não tem senha de aplicativo, gere uma:')
      console.error('      → Ative verificação em duas etapas: https://myaccount.google.com/security')
      console.error('      → Gere senha de app: https://myaccount.google.com/apppasswords')
      console.error('      → Selecione "Email" e "Outro (nome personalizado)"')
      console.error('      → Digite "Sintonia Med Backup" e gere')
      console.error('      → Copie os 16 caracteres (sem espaços)')
      console.error('')
      console.error('   4️⃣ Atualize o secret EMAIL_PASSWORD:')
      console.error('      firebase functions:secrets:set EMAIL_PASSWORD')
      console.error('      (Cole APENAS os 16 caracteres, sem espaços)')
      console.error('')
      console.error('   5️⃣ Aguarde alguns minutos após atualizar o secret')
      console.error('      → O Firebase pode levar alguns minutos para propagar')
      console.error('      → Tente novamente após 2-3 minutos')
      console.error('')
      
      throw new Error(
        'Credenciais inválidas. Verifique se: ' +
        '(1) EMAIL_USER está correto, ' +
        '(2) está usando senha de aplicativo de 16 caracteres (não senha normal), ' +
        '(3) copiou todos os caracteres sem espaços. ' +
        'Gere senha de app em: https://myaccount.google.com/apppasswords'
      )
    }
    
    // Verificar se é erro de senha de aplicativo específica
    if (errorMessage.includes('Application-specific password required') || 
        errorMessage.includes('InvalidSecondFactor')) {
      console.error('')
      console.error('   ⚠️⚠️⚠️ PROBLEMA IDENTIFICADO: SENHA DE APLICATIVO NECESSÁRIA ⚠️⚠️⚠️')
      console.error('')
      console.error('   O Gmail está exigindo uma SENHA DE APLICATIVO (App Password) em vez da senha normal.')
      console.error('')
      console.error('   📋 PASSO A PASSO PARA RESOLVER:')
      console.error('')
      console.error('   1️⃣ Ative a Verificação em Duas Etapas no Gmail:')
      console.error('      → Acesse: https://myaccount.google.com/security')
      console.error('      → Ative "Verificação em duas etapas"')
      console.error('')
      console.error('   2️⃣ Gere uma Senha de Aplicativo:')
      console.error('      → Acesse: https://myaccount.google.com/apppasswords')
      console.error('      → Selecione "Email" como aplicativo')
      console.error('      → Selecione "Outro (nome personalizado)" como dispositivo')
      console.error('      → Digite um nome (ex: "Sintonia Med Backup")')
      console.error('      → Clique em "Gerar"')
      console.error('')
      console.error('   3️⃣ Copie a senha gerada (16 caracteres, sem espaços)')
      console.error('')
      console.error('   4️⃣ Configure o secret EMAIL_PASSWORD com a senha de aplicativo:')
      console.error('      firebase functions:secrets:set EMAIL_PASSWORD')
      console.error('      (Cole a senha de 16 caracteres quando solicitado)')
      console.error('')
      console.error('   ⚠️ IMPORTANTE: Use a SENHA DE APLICATIVO (16 caracteres), NÃO a senha normal do Gmail!')
      console.error('')
      
      throw new Error(
        'Gmail requer senha de aplicativo. ' +
        'Ative a verificação em duas etapas e gere uma senha de aplicativo em ' +
        'https://myaccount.google.com/apppasswords. ' +
        'Depois configure o secret EMAIL_PASSWORD com a senha de aplicativo gerada.'
      )
    }
    
    // Verificar outros tipos de erro de autenticação
    if (errorMessage.includes('Invalid login') || errorMessage.includes('authentication')) {
      console.error('')
      console.error('   ⚠️ PROBLEMA DE AUTENTICAÇÃO detectado')
      console.error('   Verifique se:')
      console.error('      1. O email e senha estão corretos')
      console.error('      2. A senha de app está sendo usada (não a senha normal)')
      console.error('      3. A verificação em duas etapas está ativada no Gmail')
      console.error('      4. Uma senha de app foi gerada em: https://myaccount.google.com/apppasswords')
    }
    
    // Verificar erro de quota
    if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
      console.error('   ⚠️ ERRO DE QUOTA/RATE LIMIT detectado')
      console.error('   Aguarde alguns minutos e tente novamente')
    }
    
    // Verificar erro de timeout
    if (errorMessage.includes('timeout')) {
      console.error('   ⚠️ ERRO DE TIMEOUT detectado')
      console.error('   Verifique sua conexão com a internet')
    }
    
    console.error(`   Stack completo: ${sendError.stack}`)
    console.error('')
    console.error('═══════════════════════════════════════════════════════')
    console.error('❌ [sendBackupEmail] FALHA NO ENVIO')
    console.error('═══════════════════════════════════════════════════════')
    
    throw sendError
  }
}

/**
 * Cloud Function agendada para fazer backup semanal das questões
 * Executa toda segunda-feira às 00:00 UTC (21:00 de domingo no horário de Brasília)
 */
export const weeklyQuestionsBackup = functions.scheduler.onSchedule(
  {
    schedule: '0 0 * * 1', // Toda segunda-feira às 00:00 UTC
    timeZone: 'America/Sao_Paulo', // Horário de Brasília
    memory: '1GiB',
    timeoutSeconds: 540,
    secrets: ['EMAIL_USER', 'EMAIL_PASSWORD', 'CLIENT_EMAIL'], // Secrets do Firebase
  },
  async (event) => {
    console.log('Iniciando backup semanal das questões...')

    try {
      // Acessar os secrets do Firebase
      const emailUser = process.env.EMAIL_USER
      const emailPassword = process.env.EMAIL_PASSWORD
      const clientEmail = process.env.CLIENT_EMAIL

      const db = admin.firestore()
      
      // Buscar todas as questões
      console.log('Buscando questões do Firestore...')
      const questionsSnapshot = await db.collection('questions').get()
      
      if (questionsSnapshot.empty) {
        console.log('Nenhuma questão encontrada para backup.')
        return
      }

      const questions: QuestionData[] = []
      questionsSnapshot.forEach((doc) => {
        questions.push({
          id: doc.id,
          ...doc.data(),
        } as QuestionData)
      })

      console.log(`Encontradas ${questions.length} questões. Criando arquivo Excel...`)

      // Criar arquivo Excel
      const excelBuffer = await createExcelFile(questions)

      // Gerar nome do arquivo com data
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0] // YYYY-MM-DD
      const fileName = `backup-questoes-${dateStr}.xlsx`

      console.log(`Fazendo upload do arquivo ${fileName} para o Firebase Storage...`)

      // Fazer upload para Firebase Storage
      const downloadUrl = await uploadToFirebaseStorage(excelBuffer, fileName)

      console.log(`✅ Backup salvo no Firebase Storage!`)
      console.log(`📁 URL: ${downloadUrl}`)

      // Enviar email para o cliente (se configurado)
      console.log('')
      console.log('═══════════════════════════════════════════════════════')
      console.log('📧 VERIFICANDO CONFIGURAÇÃO DE EMAIL')
      console.log('═══════════════════════════════════════════════════════')
      console.log(`EMAIL_USER presente: ${emailUser ? '✅ SIM' : '❌ NÃO'}`)
      console.log(`EMAIL_PASSWORD presente: ${emailPassword ? '✅ SIM' : '❌ NÃO'}`)
      console.log(`CLIENT_EMAIL presente: ${clientEmail ? '✅ SIM' : '❌ NÃO'}`)
      
      if (emailUser && emailPassword && clientEmail) {
        console.log('')
        console.log('✅ Todos os secrets estão configurados. Tentando enviar email...')
        try {
          await sendBackupEmail(fileName, downloadUrl, questions.length, emailUser, emailPassword, clientEmail)
          console.log(`📧 Email enviado com sucesso!`)
        } catch (emailError: any) {
          console.error('')
          console.error('═══════════════════════════════════════════════════════')
          console.error('❌ ERRO AO ENVIAR EMAIL NA FUNÇÃO AGENDADA')
          console.error('═══════════════════════════════════════════════════════')
          console.error(`Mensagem: ${emailError.message}`)
          console.error(`Stack: ${emailError.stack}`)
          console.error('═══════════════════════════════════════════════════════')
          // Não re-throw aqui para não falhar o backup completo se o email falhar
        }
      } else {
        console.log('')
        console.log('⚠️ Secrets de email não configurados. Email não enviado.')
        console.log('Configure os secrets usando:')
        console.log('  firebase functions:secrets:set EMAIL_USER')
        console.log('  firebase functions:secrets:set EMAIL_PASSWORD')
        console.log('  firebase functions:secrets:set CLIENT_EMAIL')
      }

      console.log(`✅ Backup concluído com sucesso!`)
      console.log(`📊 Total de questões: ${questions.length}`)
      console.log(`📄 Nome do arquivo: ${fileName}`)
      console.log(`🕐 Timestamp: ${now.toISOString()}`)
    } catch (error: any) {
      console.error('❌ Erro ao fazer backup:', error)
      // Re-throw para que o Cloud Scheduler registre o erro
      throw error
    }
  }
)

/**
 * Cloud Function HTTP para testar o backup manualmente
 * Pode ser chamada via: POST /backupQuestions
 */
export const backupQuestionsManual = functions.https.onRequest(
  {
    memory: '1GiB',
    timeoutSeconds: 540,
    invoker: 'public', // Permite invocações não autenticadas
    secrets: ['EMAIL_USER', 'EMAIL_PASSWORD', 'CLIENT_EMAIL'], // Secrets do Firebase
  },
  async (req, res) => {
    console.log('========================================')
    console.log('🚀 INICIANDO BACKUP MANUAL DAS QUESTÕES')
    console.log('========================================')

    try {
      // ========== PASSO 1: Verificar Secrets ==========
      console.log('')
      console.log('📋 PASSO 1: Verificando secrets do Firebase...')
      
      const emailUser = process.env.EMAIL_USER
      const emailPassword = process.env.EMAIL_PASSWORD
      const clientEmail = process.env.CLIENT_EMAIL

      console.log(`   EMAIL_USER: ${emailUser ? `✅ Configurado (${emailUser})` : '❌ NÃO CONFIGURADO'}`)
      console.log(`   EMAIL_PASSWORD: ${emailPassword ? '✅ Configurado (****)' : '❌ NÃO CONFIGURADO'}`)
      console.log(`   CLIENT_EMAIL: ${clientEmail ? `✅ Configurado (${clientEmail})` : '❌ NÃO CONFIGURADO'}`)
      
      const secretsConfigured = !!(emailUser && emailPassword && clientEmail)
      console.log(`   Secrets configurados: ${secretsConfigured ? '✅ SIM' : '❌ NÃO'}`)

      // ========== PASSO 2: Buscar Questões ==========
      console.log('')
      console.log('📋 PASSO 2: Buscando questões do Firestore...')
      
      const db = admin.firestore()
      const questionsSnapshot = await db.collection('questions').get()
      
      if (questionsSnapshot.empty) {
        console.log('   ⚠️ Nenhuma questão encontrada!')
        res.status(200).json({
          success: true,
          message: 'Nenhuma questão encontrada para backup.',
          questionsCount: 0,
        })
        return
      }

      const questions: QuestionData[] = []
      questionsSnapshot.forEach((doc) => {
        questions.push({
          id: doc.id,
          ...doc.data(),
        } as QuestionData)
      })

      console.log(`   ✅ Encontradas ${questions.length} questões`)

      // ========== PASSO 3: Criar Excel ==========
      console.log('')
      console.log('📋 PASSO 3: Criando arquivo Excel...')
      
      const excelBuffer = await createExcelFile(questions)
      console.log(`   ✅ Excel criado (${excelBuffer.length} bytes)`)

      // ========== PASSO 4: Upload para Storage ==========
      console.log('')
      console.log('📋 PASSO 4: Fazendo upload para Firebase Storage...')
      
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      const fileName = `backup-questoes-${dateStr}.xlsx`

      const downloadUrl = await uploadToFirebaseStorage(excelBuffer, fileName)
      console.log(`   ✅ Upload concluído!`)
      console.log(`   📁 Arquivo: ${fileName}`)
      console.log(`   🔗 URL: ${downloadUrl}`)

      // ========== PASSO 5: Enviar Email ==========
      console.log('')
      console.log('📋 PASSO 5: Enviando email...')
      
      let emailSent = false
      let emailError: string | null = null
      
      if (secretsConfigured) {
        console.log(`   📧 Preparando envio para: ${clientEmail}`)
        console.log(`   📧 Remetente: ${emailUser}`)
        
        try {
          await sendBackupEmail(fileName, downloadUrl, questions.length, emailUser!, emailPassword!, clientEmail!)
          emailSent = true
          console.log(`   ✅ EMAIL ENVIADO COM SUCESSO para: ${clientEmail}`)
        } catch (err: any) {
          emailError = err.message
          console.error(`   ❌ ERRO AO ENVIAR EMAIL: ${err.message}`)
          console.error(`   Stack: ${err.stack}`)
        }
      } else {
        console.log('   ⚠️ Email NÃO enviado - secrets não configurados')
        console.log('   Configure os secrets usando:')
        console.log('   firebase functions:secrets:set EMAIL_USER')
        console.log('   firebase functions:secrets:set EMAIL_PASSWORD')
        console.log('   firebase functions:secrets:set CLIENT_EMAIL')
      }

      // ========== RESULTADO FINAL ==========
      console.log('')
      console.log('========================================')
      console.log('✅ BACKUP CONCLUÍDO!')
      console.log(`   Questões: ${questions.length}`)
      console.log(`   Arquivo: ${fileName}`)
      console.log(`   Email enviado: ${emailSent ? 'SIM' : 'NÃO'}`)
      if (emailSent) console.log(`   Destinatário: ${clientEmail}`)
      if (emailError) console.log(`   Erro email: ${emailError}`)
      console.log('========================================')

      res.status(200).json({
        success: true,
        message: 'Backup concluído com sucesso!',
        questionsCount: questions.length,
        fileName,
        downloadUrl,
        email: {
          sent: emailSent,
          from: emailUser || null,
          to: clientEmail || null,
          error: emailError,
          secretsConfigured,
        },
        timestamp: now.toISOString(),
      })
    } catch (error: any) {
      console.error('')
      console.error('========================================')
      console.error('❌ ERRO NO BACKUP!')
      console.error(`   Mensagem: ${error.message}`)
      console.error(`   Stack: ${error.stack}`)
      console.error('========================================')
      
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
      })
    }
  }
)
