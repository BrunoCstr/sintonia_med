import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { authenticator } from 'otplib'
import * as admin from 'firebase-admin'

/**
 * PUT /api/admin/two-factor/verify
 * Verifica um código 2FA durante o login
 * 
 * Body:
 * {
 *   uid: string,
 *   code: string
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { uid, code } = body

    if (!uid || !code) {
      return NextResponse.json(
        { error: 'uid e code são obrigatórios' },
        { status: 400 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Buscar informações de 2FA do usuário
    const userDoc = await db.collection('users').doc(uid).get()
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()
    
    // Verificar se 2FA está ativado
    if (!userData?.twoFactorEnabled || !userData?.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA não está ativado para este usuário' },
        { status: 400 }
      )
    }

    const secret = userData.twoFactorSecret

    // Normalizar código (remover espaços e garantir que seja string)
    const normalizedCode = String(code).replace(/\s/g, '').trim()

    // Verificar código TOTP com janela de tolerância maior para compensar diferenças de horário
    // window: 2 significa aceitar códigos de ±2 timesteps (±60 segundos)
    // step: 30 significa que cada timestep é de 30 segundos
    const isValid = authenticator.check(normalizedCode, secret, { 
      window: 2,
      step: 30,
    })

    // Se não for válido, verificar códigos de backup
    if (!isValid && userData.twoFactorBackupCodes) {
      const backupCodes = userData.twoFactorBackupCodes as string[]
      const codeIndex = backupCodes.indexOf(normalizedCode.toUpperCase())
      
      if (codeIndex !== -1) {
        // Remover código de backup usado
        backupCodes.splice(codeIndex, 1)
        await db.collection('users').doc(uid).update({
          twoFactorBackupCodes: backupCodes,
        })
        
        return NextResponse.json({
          success: true,
          usedBackupCode: true,
          remainingBackupCodes: backupCodes.length,
        })
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Código inválido' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      usedBackupCode: false,
    })
  } catch (error: any) {
    console.error('Erro ao verificar código 2FA:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao verificar código 2FA' },
      { status: 500 }
    )
  }
}









