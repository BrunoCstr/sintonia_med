import { NextRequest, NextResponse } from 'next/server'
import { verifyAnyRole, getAdminApp } from '@/lib/firebase-admin'
import * as admin from 'firebase-admin'
import { authenticator } from 'otplib'

// Configurar authenticator com opções padrão
authenticator.options = {
  step: 30, // 30 segundos por timestep
  window: [1, 1], // Aceitar ±1 timestep (±30 segundos)
}

/**
 * GET /api/admin/two-factor
 * Obtém o status do 2FA do usuário atual
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requesterUid = searchParams.get('requesterUid')

    if (!requesterUid) {
      return NextResponse.json(
        { error: 'requesterUid é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o requester é admin
    const isAdmin = await verifyAnyRole(requesterUid, ['admin_master', 'admin_questoes'])
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar 2FA.' },
        { status: 403 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Buscar informações de 2FA do usuário
    const userDoc = await db.collection('users').doc(requesterUid).get()
    
    if (!userDoc.exists) {
      return NextResponse.json({
        enabled: false,
        secret: null,
        backupCodes: null,
      })
    }

    const userData = userDoc.data()
    const twoFactorEnabled = userData?.twoFactorEnabled === true
    const twoFactorSecret = userData?.twoFactorSecret || null

    return NextResponse.json({
      enabled: twoFactorEnabled,
      secret: twoFactorSecret ? 'configured' : null, // Não retornar o secret real por segurança
      hasSecret: !!twoFactorSecret,
    })
  } catch (error: any) {
    console.error('Erro ao buscar status do 2FA:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar status do 2FA' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/two-factor
 * Gera um novo secret para 2FA ou ativa 2FA após verificação
 * 
 * Body:
 * {
 *   requesterUid: string,
 *   action: 'generate' | 'enable' | 'disable',
 *   code?: string (necessário para 'enable'),
 *   secret?: string (necessário para 'enable')
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requesterUid, action, code, secret } = body

    if (!requesterUid || !action) {
      return NextResponse.json(
        { error: 'requesterUid e action são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se o requester é admin
    const isAdmin = await verifyAnyRole(requesterUid, ['admin_master', 'admin_questoes'])
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem gerenciar 2FA.' },
        { status: 403 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Buscar informações do usuário
    const authUser = await app.auth().getUser(requesterUid)
    const userRef = db.collection('users').doc(requesterUid)
    const userDoc = await userRef.get()

    if (action === 'generate') {
      // Gerar novo secret com configurações explícitas
      const newSecret = authenticator.generateSecret()
      const serviceName = 'SintoniaMed'
      const accountName = authUser.email || requesterUid

      // Gerar URL para QR Code com configurações explícitas
      // step: 30 segundos, digits: 6 dígitos
      const otpAuthUrl = authenticator.keyuri(accountName, serviceName, newSecret, {
        step: 30,
        digits: 6,
      })
      
      // Gerar um código de teste para verificar se está funcionando
      const testCode = authenticator.generate(newSecret, { step: 30 })
      console.log('Generated secret and test code:', {
        secretLength: newSecret.length,
        secretPrefix: newSecret.substring(0, 8),
        testCode,
        otpAuthUrl,
      })

      // Salvar secret temporariamente (não ativado ainda)
      if (userDoc.exists) {
        await userRef.update({
          twoFactorSecret: newSecret,
          twoFactorEnabled: false,
          twoFactorSecretGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      } else {
        await userRef.set({
          email: authUser.email,
          name: authUser.displayName || authUser.email?.split('@')[0] || 'Usuário',
          twoFactorSecret: newSecret,
          twoFactorEnabled: false,
          twoFactorSecretGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true })
      }

      return NextResponse.json({
        success: true,
        secret: newSecret,
        otpAuthUrl,
        message: 'Secret gerado com sucesso. Escaneie o QR Code e confirme com um código.',
      })
    }

    if (action === 'enable') {
      if (!code || !secret) {
        return NextResponse.json(
          { error: 'code e secret são obrigatórios para ativar 2FA' },
          { status: 400 }
        )
      }

      // Buscar secret do banco primeiro
      const userData = userDoc.data()
      const storedSecret = userData?.twoFactorSecret

      if (!storedSecret) {
        return NextResponse.json(
          { error: 'Secret não encontrado. Gere um novo secret primeiro.' },
          { status: 400 }
        )
      }

      // Verificar se o secret do request corresponde ao do banco
      if (storedSecret !== secret) {
        console.log('Secret mismatch:', {
          requestSecret: secret.substring(0, 8) + '...',
          storedSecret: storedSecret.substring(0, 8) + '...',
          requestLength: secret.length,
          storedLength: storedSecret.length,
        })
        return NextResponse.json(
          { error: 'Secret inválido. Gere um novo secret.' },
          { status: 400 }
        )
      }

      // Normalizar código (remover espaços e garantir que seja string)
      const normalizedCode = String(code).replace(/\s/g, '').trim()

      // Validar formato do código (deve ter 6 dígitos)
      if (!/^\d{6}$/.test(normalizedCode)) {
        return NextResponse.json(
          { error: 'Código deve conter exatamente 6 dígitos numéricos.' },
          { status: 400 }
        )
      }

      // Usar o secret do banco (não do request) para verificar
      // Verificar código TOTP com janela de tolerância maior para compensar diferenças de horário
      // window: 2 significa aceitar códigos de ±2 timesteps (±60 segundos)
      // step: 30 significa que cada timestep é de 30 segundos
      const isValid = authenticator.check(normalizedCode, storedSecret, { 
        window: 2,
        step: 30,
      })

      if (!isValid) {
        // Tentar verificar com window ainda maior como fallback (para debug)
        const isValidWithLargerWindow = authenticator.check(normalizedCode, storedSecret, { 
          window: 5,
          step: 30,
        })
        
        // Gerar código atual para debug
        const currentCode = authenticator.generate(storedSecret, { step: 30 })
        
        console.log('2FA Verification Debug:', {
          codeLength: normalizedCode.length,
          codeFormat: /^\d{6}$/.test(normalizedCode),
          secretLength: storedSecret.length,
          secretPrefix: storedSecret.substring(0, 8),
          providedCode: normalizedCode,
          currentGeneratedCode: currentCode,
          isValid,
          isValidWithLargerWindow,
          timestamp: new Date().toISOString(),
        })

        return NextResponse.json(
          { 
            error: 'Código inválido. Verifique e tente novamente.',
            hint: 'Certifique-se de usar o código mais recente do seu aplicativo autenticador. Os códigos expiram a cada 30 segundos. Verifique também se o horário do seu dispositivo está sincronizado corretamente.'
          },
          { status: 400 }
        )
      }

      // Gerar códigos de backup
      const backupCodes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      )

      // Ativar 2FA
      await userRef.update({
        twoFactorEnabled: true,
        twoFactorBackupCodes: backupCodes,
        twoFactorEnabledAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      return NextResponse.json({
        success: true,
        backupCodes,
        message: 'Autenticação de dois fatores ativada com sucesso!',
      })
    }

    if (action === 'disable') {
      // Desativar 2FA
      await userRef.update({
        twoFactorEnabled: false,
        twoFactorSecret: admin.firestore.FieldValue.delete(),
        twoFactorBackupCodes: admin.firestore.FieldValue.delete(),
        twoFactorEnabledAt: admin.firestore.FieldValue.delete(),
        twoFactorSecretGeneratedAt: admin.firestore.FieldValue.delete(),
      })

      return NextResponse.json({
        success: true,
        message: 'Autenticação de dois fatores desativada com sucesso.',
      })
    }

    return NextResponse.json(
      { error: 'Ação inválida. Use: generate, enable ou disable' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Erro ao gerenciar 2FA:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao gerenciar 2FA' },
      { status: 500 }
    )
  }
}


