import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * POST /api/user/upload-avatar
 * Faz upload de uma foto de perfil para Firebase Storage
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação - tentar header Authorization primeiro, depois cookie
    let token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      token = request.cookies.get('firebase-token')?.value
    }
    
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 })
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Arquivo deve ser uma imagem' }, { status: 400 })
    }

    // Validar tamanho (máximo 2MB para avatar)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Arquivo muito grande (máximo 2MB)' }, { status: 400 })
    }

    const app = getAdminApp()
    const storage = app.storage()

    // Obter bucket name das variáveis de ambiente
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

    // Gerar nome do arquivo usando o ID do usuário
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `avatars/${authUser.uid}/avatar.${fileExtension}`

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
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`

    // Atualizar perfil do usuário com a URL da foto
    const db = app.firestore()
    const userRef = db.collection('users').doc(authUser.uid)
    await userRef.update({
      photoURL: publicUrl,
      updatedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
    })
  } catch (error: any) {
    console.error('Erro ao fazer upload da foto de perfil:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao fazer upload da foto de perfil' },
      { status: 500 }
    )
  }
}

