import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import * as admin from 'firebase-admin'

const AVAILABILITY_DOC = 'settings/availability'

// GET - Buscar disponibilidade
export async function GET(request: NextRequest) {
  try {
    const app = getAdminApp()
    const db = app.firestore()
    const doc = await db.doc(AVAILABILITY_DOC).get()
    
    if (!doc.exists) {
      // Retornar valores padrão se não existir
      const defaultAvailability = {
        periods: {
          '1': false,
          '2': false,
          '3': false,
          '4': false,
          '5': false,
          '6': false,
          '7': false,
          '8': false,
        },
        subjects: {
          '1-5': {
            SOI: false,
            HAM: false,
            IESC: false,
            MCM: false,
          },
          '6-8': {
            CI: false,
            HAM: false,
            IESC: false,
            MCM: false,
          },
        },
      }
      
      return NextResponse.json({
        success: true,
        availability: defaultAvailability,
      })
    }

    return NextResponse.json({
      success: true,
      availability: doc.data(),
    })
  } catch (error) {
    console.error('Erro ao buscar disponibilidade:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar disponibilidade' },
      { status: 500 }
    )
  }
}

// POST - Atualizar disponibilidade (apenas admin)
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1]
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token não fornecido' },
        { status: 401 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Verificar token
    let decodedToken
    try {
      decodedToken = await app.auth().verifyIdToken(token)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      )
    }

    const userId = decodedToken.uid

    // Verificar se é admin
    const userDoc = await db.collection('users').doc(userId).get()
    const userData = userDoc.data()

    if (!userData || userData.role !== 'admin_master') {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { availability } = body

    if (!availability) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // Atualizar no Firestore
    await db.doc(AVAILABILITY_DOC).set(availability, { merge: true })

    return NextResponse.json({
      success: true,
      message: 'Disponibilidade atualizada com sucesso',
    })
  } catch (error) {
    console.error('Erro ao atualizar disponibilidade:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar disponibilidade' },
      { status: 500 }
    )
  }
}


