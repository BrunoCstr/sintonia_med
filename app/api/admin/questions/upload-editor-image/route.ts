import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'

/**
 * POST /api/admin/questions/upload-editor-image
 * Faz upload de uma imagem do editor rico para Firebase Storage (apenas admins)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser || (authUser.role !== 'admin_master' && authUser.role !== 'admin_questoes')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
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

    // Validar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Arquivo muito grande (máximo 5MB)' }, { status: 400 })
    }

    const app = getAdminApp()
    const storage = app.storage()

    // Obter bucket name das variáveis de ambiente, do app ou usar o padrão do projeto
    let bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
                     process.env.FIREBASE_STORAGE_BUCKET

    // Se não houver bucket configurado, usar o padrão do projeto
    if (!bucketName) {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 
                       process.env.FIREBASE_PROJECT_ID
      if (projectId) {
        // Bucket padrão do Firebase: {project-id}.appspot.com
        bucketName = `${projectId}.appspot.com`
      } else {
        return NextResponse.json(
          { error: 'Bucket name não configurado. Configure NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ou NEXT_PUBLIC_FIREBASE_PROJECT_ID' },
          { status: 500 }
        )
      }
    }

    // Gerar nome do arquivo único para imagens do editor
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileName = `editor-images/${timestamp}_${randomString}.${fileExtension}`

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

    return NextResponse.json({
      success: true,
      url: publicUrl,
    })
  } catch (error: any) {
    console.error('Erro ao fazer upload da imagem do editor:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao fazer upload da imagem' },
      { status: 500 }
    )
  }
}



