/**
 * Script para definir roles de usuários manualmente
 * 
 * Uso:
 *   pnpm tsx scripts/set-user-role.ts <email> <role>
 * 
 * Exemplos:
 *   pnpm tsx scripts/set-user-role.ts contato@brunocastrodev.com.br admin_master
 *   pnpm tsx scripts/set-user-role.ts usuario@example.com admin_questoes
 *   pnpm tsx scripts/set-user-role.ts usuario@example.com aluno
 */

import * as admin from 'firebase-admin'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'

// Tipos de roles válidos
type UserRole = 'aluno' | 'admin_master' | 'admin_questoes'

// Inicializar Firebase Admin SDK
function initializeAdmin() {
  // Verificar se já está inicializado
  if (admin.apps.length > 0) {
    return admin.app()
  }

  // Tentar usar service account key se existir
  // Procura por arquivos JSON do Firebase Admin SDK
  const rootDir = process.cwd()
  const possibleNames = [
    'firebase-service-account.json', // Nome padrão
    process.env.FIREBASE_SERVICE_ACCOUNT_FILE, // Nome customizado via env
  ]
  
  // Procurar por qualquer arquivo que contenha "firebase-adminsdk" no nome
  let serviceAccountFile: string | null = null
  
  try {
    const files = readdirSync(rootDir)
    const firebaseAdminFiles = files.filter((file: string) => 
      file.endsWith('.json') && 
      (file.includes('firebase-adminsdk') || file === 'firebase-service-account.json')
    )
    
    if (firebaseAdminFiles.length > 0) {
      serviceAccountFile = firebaseAdminFiles[0]
      console.log(`📁 Arquivo encontrado: ${serviceAccountFile}`)
    }
  } catch (error) {
    // Ignorar erro de leitura de diretório
  }

  // Tentar carregar o arquivo encontrado ou os nomes possíveis
  let serviceAccount: any = null
  
  for (const fileName of [serviceAccountFile, ...possibleNames].filter(Boolean)) {
    if (!fileName) continue
    
    try {
      const serviceAccountPath = join(rootDir, fileName)
      if (existsSync(serviceAccountPath)) {
        serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
        console.log(`✅ Carregando service account de: ${fileName}`)
        break
      }
    } catch (error) {
      // Continuar tentando outros arquivos
    }
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
    console.log('✅ Firebase Admin inicializado com service account')
    return admin.app()
  }

  // Se não encontrar service account, usar variáveis de ambiente
  if (!process.env.FIREBASE_PROJECT_ID) {
    throw new Error(
      '❌ Firebase Admin não configurado. Configure uma das opções:\n' +
      '  1. Coloque um arquivo JSON do Firebase Admin SDK na raiz do projeto\n' +
      '     (pode ter qualquer nome, mas deve conter "firebase-adminsdk" ou ser "firebase-service-account.json")\n' +
      '  2. Ou defina as variáveis de ambiente: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY\n' +
      '  3. Ou defina FIREBASE_SERVICE_ACCOUNT_FILE com o nome exato do arquivo'
    )
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
  
  console.log('✅ Firebase Admin inicializado com variáveis de ambiente')
  return admin.app()
}

// Função principal para definir role
async function setUserRole(email: string, role: UserRole) {
  try {
    // Validar role
    const validRoles: UserRole[] = ['aluno', 'admin_master', 'admin_questoes']
    if (!validRoles.includes(role)) {
      throw new Error(`❌ Role inválido: ${role}. Roles válidos: ${validRoles.join(', ')}`)
    }

    console.log(`\n🔍 Buscando usuário com email: ${email}...`)

    // Buscar usuário por email
    let user
    try {
      user = await admin.auth().getUserByEmail(email)
      console.log(`✅ Usuário encontrado: ${user.displayName || user.email} (UID: ${user.uid})`)
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        throw new Error(`❌ Usuário não encontrado com email: ${email}`)
      }
      throw error
    }

    // Verificar role atual
    const currentRole = user.customClaims?.role
    if (currentRole === role) {
      console.log(`⚠️  Usuário já possui a role: ${role}`)
      return
    }

    console.log(`📝 Role atual: ${currentRole || 'nenhuma'}`)
    console.log(`📝 Definindo nova role: ${role}...`)

    // Definir custom claim
    await admin.auth().setCustomUserClaims(user.uid, { role })
    console.log('✅ Custom claim definido com sucesso')

    // Atualizar Firestore
    const db = admin.firestore()
    const userRef = db.collection('users').doc(user.uid)
    
    // Verificar se o documento existe
    const userDoc = await userRef.get()
    
    if (userDoc.exists) {
      await userRef.update({
        role,
        roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      console.log('✅ Documento do Firestore atualizado')
    } else {
      // Se o documento não existe, criar com dados básicos
      await userRef.set({
        email: user.email,
        name: user.displayName || user.email?.split('@')[0] || 'Usuário',
        role,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      console.log('✅ Documento do Firestore criado')
    }

    console.log(`\n✅ Sucesso! Role '${role}' definida para ${email}`)
    console.log(`\n⚠️  IMPORTANTE: O usuário precisa fazer logout e login novamente para que as mudanças tenham efeito.`)
    
  } catch (error: any) {
    console.error('\n❌ Erro ao definir role:', error.message)
    process.exit(1)
  }
}

// Executar script
async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log(`
📖 Uso do script:
   pnpm tsx scripts/set-user-role.ts <email> <role>

📋 Roles válidos:
   - aluno
   - admin_master
   - admin_questoes

💡 Exemplos:
   pnpm tsx scripts/set-user-role.ts contato@brunocastrodev.com.br admin_master
   pnpm tsx scripts/set-user-role.ts usuario@example.com admin_questoes
   pnpm tsx scripts/set-user-role.ts usuario@example.com aluno
    `)
    process.exit(1)
  }

  const [email, role] = args

  // Inicializar Admin SDK
  initializeAdmin()

  // Definir role
  await setUserRole(email, role as UserRole)

  // Fechar conexão
  await admin.app().delete()
}

main().catch((error) => {
  console.error('❌ Erro fatal:', error)
  process.exit(1)
})

