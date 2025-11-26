import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'

/**
 * POST /api/auth/check-rate-limit
 * Verifica rate limit por IP para criação de conta
 */
export async function POST(request: NextRequest) {
  try {
    const app = getAdminApp()
    const db = app.firestore()

    // Obter IP do cliente
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'

    // Se não conseguir obter IP, permitir (pode ser em desenvolvimento)
    if (ip === 'unknown' || !ip) {
      return NextResponse.json({ allowed: true, remaining: 3 })
    }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    // Buscar tentativas de registro deste IP hoje
    const ipDocRef = db.collection('rate_limits').doc(`register_${ip}`)
    const ipDoc = await ipDocRef.get()

    let attempts = 0
    let lastAttempt: Date | null = null

    if (ipDoc.exists) {
      const data = ipDoc.data()
      const lastAttemptDate = data?.lastAttempt?.toDate ? data.lastAttempt.toDate() : new Date(data?.lastAttempt || 0)
      
      // Se a última tentativa foi hoje, usar o contador
      if (lastAttemptDate >= startOfDay && lastAttemptDate < endOfDay) {
        attempts = data?.attempts || 0
        lastAttempt = lastAttemptDate
      }
    }

    const maxAttempts = 3
    const allowed = attempts < maxAttempts
    const remaining = Math.max(0, maxAttempts - attempts)

    return NextResponse.json({
      allowed,
      remaining,
      attempts,
      maxAttempts,
    })
  } catch (error: any) {
    console.error('Erro ao verificar rate limit:', error)
    // Em caso de erro, permitir (fail open)
    return NextResponse.json({ allowed: true, remaining: 3 })
  }
}

/**
 * POST /api/auth/increment-rate-limit
 * Incrementa o contador de tentativas de registro por IP
 */
export async function PUT(request: NextRequest) {
  try {
    const app = getAdminApp()
    const db = app.firestore()

    // Obter IP do cliente
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'

    if (ip === 'unknown' || !ip) {
      return NextResponse.json({ success: true })
    }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    const ipDocRef = db.collection('rate_limits').doc(`register_${ip}`)
    const ipDoc = await ipDocRef.get()

    if (ipDoc.exists) {
      const data = ipDoc.data()
      const lastAttemptDate = data?.lastAttempt?.toDate ? data.lastAttempt.toDate() : new Date(data?.lastAttempt || 0)
      
      // Se a última tentativa foi hoje, incrementar
      if (lastAttemptDate >= startOfDay && lastAttemptDate < endOfDay) {
        await ipDocRef.update({
          attempts: (data?.attempts || 0) + 1,
          lastAttempt: now,
        })
      } else {
        // Nova tentativa em um novo dia, resetar contador
        await ipDocRef.set({
          attempts: 1,
          lastAttempt: now,
          createdAt: now,
        })
      }
    } else {
      // Primeira tentativa deste IP
      await ipDocRef.set({
        attempts: 1,
        lastAttempt: now,
        createdAt: now,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao incrementar rate limit:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

