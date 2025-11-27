import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * POST /api/reports
 * Cria um novo report (qualquer usuário autenticado)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const questionId = formData.get('questionId') as string | null
    const texto = formData.get('texto') as string
    const tipos = formData.get('tipos') as string // JSON array string
    const file = formData.get('file') as File | null

    // Validações
    if (!texto || !texto.trim()) {
      return NextResponse.json(
        { error: 'O texto é obrigatório' },
        { status: 400 }
      )
    }

    const app = getAdminApp()
    const db = app.firestore()

    // Buscar dados do usuário
    const userDoc = await db.collection('users').doc(authUser.uid).get()
    const userData = userDoc.exists ? userDoc.data() : null

    const userName = userData?.name || userData?.displayName || authUser.email?.split('@')[0] || 'Usuário'
    const userEmail = authUser.email || ''

    // Processar upload de imagem se houver
    let imagemUrl: string | undefined = undefined

    if (file && file.size > 0) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Arquivo deve ser uma imagem' },
          { status: 400 }
        )
      }

      // Validar tamanho (máximo 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'Arquivo muito grande (máximo 5MB)' },
          { status: 400 }
        )
      }

      const storage = app.storage()

      // Obter bucket name
      let bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 
                       process.env.FIREBASE_STORAGE_BUCKET

      if (!bucketName) {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 
                         process.env.FIREBASE_PROJECT_ID
        if (projectId) {
          bucketName = `${projectId}.appspot.com`
        } else {
          return NextResponse.json(
            { error: 'Bucket name não configurado' },
            { status: 500 }
          )
        }
      }

      // Gerar nome do arquivo
      const fileExtension = file.name.split('.').pop()
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      const fileName = `reports/${timestamp}_${randomString}.${fileExtension}`

      // Converter File para Buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Fazer upload para Firebase Storage
      const bucket = storage.bucket(bucketName)
      const fileRef = bucket.file(fileName)

      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
        },
        public: true,
      })

      // Tornar o arquivo público e obter URL
      await fileRef.makePublic()
      imagemUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`
    }

    // Criar report no Firestore
    const reportRef = db.collection('reports').doc()
    const now = new Date()

    const reportData = {
      questionId: questionId || null, // Permite null para bugs gerais
      userId: authUser.uid,
      userName,
      userEmail,
      texto,
      tipos: tipos ? JSON.parse(tipos) : [],
      imagemUrl: imagemUrl || null,
      status: 'pendente',
      createdAt: now,
      updatedAt: now,
    }

    await reportRef.set(reportData)

    return NextResponse.json({
      success: true,
      id: reportRef.id,
      report: {
        ...reportData,
        id: reportRef.id,
      },
    })
  } catch (error: any) {
    console.error('Erro ao criar report:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar report' },
      { status: 500 }
    )
  }
}


