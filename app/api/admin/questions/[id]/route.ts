import { NextRequest, NextResponse } from 'next/server'
import { getAdminApp } from '@/lib/firebase-admin'
import { verifyFirebaseToken } from '@/lib/middleware-auth'
import type { Question } from '@/lib/types'

/**
 * GET /api/admin/questions/[id]
 * Busca uma questão específica (apenas admins)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser || (authUser.role !== 'admin_master' && authUser.role !== 'admin_questoes')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const app = getAdminApp()
    const db = app.firestore()

    const doc = await db.collection('questions').doc(id).get()

    if (!doc.exists) {
      return NextResponse.json({ error: 'Questão não encontrada' }, { status: 404 })
    }

    const data = doc.data()!
    let question: Question = {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Question

    // Se a questão tem createdBy mas não tem createdByName, buscar
    if (data.createdBy && !data.createdByName) {
      try {
        const creatorDoc = await db.collection('users').doc(data.createdBy).get()
        if (creatorDoc.exists) {
          const creatorData = creatorDoc.data()
          question.createdByName = creatorData?.name || ''
          question.createdByPhotoURL = creatorData?.photoURL || ''
        }
      } catch (error) {
        console.error(`Erro ao buscar criador da questão ${id}:`, error)
      }
    }

    return NextResponse.json({ question })
  } catch (error: any) {
    console.error('Erro ao buscar questão:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar questão' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/questions/[id]
 * Atualiza uma questão (apenas admins)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser || (authUser.role !== 'admin_master' && authUser.role !== 'admin_questoes')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const {
      enunciado,
      imagemUrl,
      alternativaA,
      alternativaB,
      alternativaC,
      alternativaD,
      alternativaE,
      alternativaCorreta,
      comentarioGabarito,
      area,
      subarea,
      disciplina,
      dificuldade,
      period,
      oficial,
      ativo,
    } = body

    const app = getAdminApp()
    const db = app.firestore()
    const storage = app.storage()

    // Verificar se a questão existe
    const docRef = db.collection('questions').doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ error: 'Questão não encontrada' }, { status: 404 })
    }

    const currentData = doc.data()!
    const oldImageUrl = currentData.imagemUrl

    // Preparar dados de atualização com validações
    const updateData: any = {
      updatedAt: new Date(),
    }

    // Validar e atualizar enunciado
    if (enunciado !== undefined) {
      if (!enunciado || typeof enunciado !== 'string' || !enunciado.trim()) {
        return NextResponse.json(
          { error: 'O enunciado é obrigatório' },
          { status: 400 }
        )
      }
      updateData.enunciado = enunciado.trim()
    }

    // Validar e atualizar imagem (opcional)
    if (imagemUrl !== undefined) {
      const newImageUrl = imagemUrl && imagemUrl.trim() ? imagemUrl.trim() : null
      updateData.imagemUrl = newImageUrl

      // Se a imagem foi removida ou substituída, deletar a imagem antiga do Storage
      if (oldImageUrl && oldImageUrl !== newImageUrl && oldImageUrl.includes('storage.googleapis.com')) {
        try {
          // Obter bucket name
          let bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 
                          process.env.FIREBASE_STORAGE_BUCKET

          if (!bucketName) {
            const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 
                             process.env.FIREBASE_PROJECT_ID
            if (projectId) {
              bucketName = `${projectId}.appspot.com`
            }
          }

          if (bucketName) {
            const bucket = storage.bucket(bucketName)
            let deleted = false

            // Tentar extrair o nome do arquivo da URL antiga
            try {
              const url = new URL(oldImageUrl)
              const pathParts = url.pathname.split('/').filter(Boolean)
              
              // O primeiro elemento é o bucket, o resto é o caminho do arquivo
              if (pathParts.length >= 2) {
                const fileName = pathParts.slice(1).join('/') // Remove o bucket e pega o resto
                const fileRef = bucket.file(fileName)
                
                const [exists] = await fileRef.exists()
                if (exists) {
                  await fileRef.delete()
                  console.log(`✅ Imagem deletada do Storage (formato antigo): ${fileName}`)
                  deleted = true
                }
              }
            } catch (urlError) {
              // Se não conseguir parsear a URL, continuar para tentar o formato novo
              console.log('Tentando deletar usando formato novo baseado no ID')
            }

            // Se não deletou com o formato antigo, tentar o formato novo baseado no ID
            if (!deleted) {
              const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
              
              for (const ext of extensions) {
                const filePath = `questions/${id}/image.${ext}`
                const fileRef = bucket.file(filePath)
                
                try {
                  const [exists] = await fileRef.exists()
                  if (exists) {
                    await fileRef.delete()
                    console.log(`✅ Imagem deletada do Storage (formato novo): ${filePath}`)
                    deleted = true
                    break
                  }
                } catch (err) {
                  // Continuar tentando outras extensões
                }
              }
            }
            
            if (!deleted) {
              console.log(`⚠️ Arquivo não encontrado no Storage para questão ${id}`)
            }
          } else {
            console.log('⚠️ Bucket name não configurado, pulando deleção de imagem')
          }
        } catch (deleteError: any) {
          // Log do erro mas não falha a atualização da questão
          console.error('Erro ao deletar imagem antiga do Storage:', deleteError)
        }
      }
    }

    // Validar e atualizar alternativas (A, B, C, D são obrigatórias, E é opcional)
    const alternativasObrigatorias = [
      { key: 'alternativaA', value: alternativaA, letter: 'A' },
      { key: 'alternativaB', value: alternativaB, letter: 'B' },
      { key: 'alternativaC', value: alternativaC, letter: 'C' },
      { key: 'alternativaD', value: alternativaD, letter: 'D' },
    ]

    for (const alt of alternativasObrigatorias) {
      if (alt.value !== undefined) {
        if (!alt.value || typeof alt.value !== 'string' || !alt.value.trim()) {
          return NextResponse.json(
            { error: `A alternativa ${alt.letter} é obrigatória` },
            { status: 400 }
          )
        }
        updateData[alt.key] = alt.value.trim()
      }
    }

    // Alternativa E é opcional
    let alternativaEValida = false
    if (alternativaE !== undefined) {
      if (alternativaE && typeof alternativaE === 'string' && alternativaE.trim()) {
        updateData.alternativaE = alternativaE.trim()
        alternativaEValida = true
      } else {
        // Se a alternativa E foi removida, limpar o campo
        updateData.alternativaE = ''
        alternativaEValida = false
      }
    } else {
      // Se não está sendo atualizada, verificar o valor atual
      alternativaEValida = currentData.alternativaE && typeof currentData.alternativaE === 'string' && currentData.alternativaE.trim() ? true : false
    }

    // Validar e atualizar alternativa correta (E só pode ser selecionada se estiver preenchida)
    if (alternativaCorreta !== undefined) {
      const alternativasValidas = alternativaEValida 
        ? ['A', 'B', 'C', 'D', 'E'] 
        : ['A', 'B', 'C', 'D']
      
      if (!alternativaCorreta || !alternativasValidas.includes(alternativaCorreta)) {
        return NextResponse.json(
          { error: 'Selecione a alternativa correta' },
          { status: 400 }
        )
      }
      updateData.alternativaCorreta = alternativaCorreta
    }

    // Validar e atualizar comentário do gabarito
    if (comentarioGabarito !== undefined) {
      if (!comentarioGabarito || typeof comentarioGabarito !== 'string' || !comentarioGabarito.trim()) {
        return NextResponse.json(
          { error: 'O comentário do gabarito é obrigatório' },
          { status: 400 }
        )
      }
      updateData.comentarioGabarito = comentarioGabarito.trim()
    }

    // Validar e atualizar área
    if (area !== undefined) {
      if (!area || typeof area !== 'string' || !area.trim()) {
        return NextResponse.json(
          { error: 'A área é obrigatória' },
          { status: 400 }
        )
      }
      updateData.area = area.trim()
    }

    // Validar e atualizar subárea
    if (subarea !== undefined) {
      if (!subarea || typeof subarea !== 'string' || !subarea.trim()) {
        return NextResponse.json(
          { error: 'A subárea é obrigatória' },
          { status: 400 }
        )
      }
      updateData.subarea = subarea.trim()
    }

    // Validar e atualizar disciplina
    if (disciplina !== undefined) {
      if (!disciplina || typeof disciplina !== 'string' || !['SOI', 'HAM', 'IESC', 'CI'].includes(disciplina)) {
        return NextResponse.json(
          { error: 'A disciplina é obrigatória' },
          { status: 400 }
        )
      }
      updateData.disciplina = disciplina
    }

    // Validar e atualizar dificuldade
    if (dificuldade !== undefined) {
      if (!dificuldade || !['facil', 'medio', 'dificil'].includes(dificuldade)) {
        return NextResponse.json(
          { error: 'A dificuldade é obrigatória' },
          { status: 400 }
        )
      }
      updateData.dificuldade = dificuldade
    }

    // Validar e atualizar período
    if (period !== undefined) {
      if (!period || typeof period !== 'string' || !period.trim()) {
        return NextResponse.json(
          { error: 'O período é obrigatório' },
          { status: 400 }
        )
      }
      updateData.period = period.trim()
    }

    // Atualizar status (ativo)
    if (ativo !== undefined) {
      updateData.ativo = Boolean(ativo)
    }

    // Atualizar campo oficial
    if (oficial !== undefined) {
      updateData.oficial = oficial === true || oficial === 'true'
    }

    await docRef.update(updateData)

    // Buscar questão atualizada
    const updatedDoc = await docRef.get()
    const data = updatedDoc.data()!
    const question = {
      id: updatedDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Question

    return NextResponse.json({
      success: true,
      question,
    })
  } catch (error: any) {
    console.error('Erro ao atualizar questão:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar questão' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/questions/[id]
 * Deleta uma questão (apenas admins)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Verificar autenticação
    const token = request.cookies.get('firebase-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const authUser = await verifyFirebaseToken(token)
    if (!authUser || (authUser.role !== 'admin_master' && authUser.role !== 'admin_questoes')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const app = getAdminApp()
    const db = app.firestore()
    const storage = app.storage()

    const docRef = db.collection('questions').doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ error: 'Questão não encontrada' }, { status: 404 })
    }

    const questionData = doc.data()!
    const imagemUrl = questionData.imagemUrl

    // Excluir imagem do Storage se existir
    if (imagemUrl && typeof imagemUrl === 'string' && imagemUrl.trim()) {
      try {
        // Obter bucket name
        let bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 
                        process.env.FIREBASE_STORAGE_BUCKET

        if (!bucketName) {
          const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 
                           process.env.FIREBASE_PROJECT_ID
          if (projectId) {
            bucketName = `${projectId}.appspot.com`
          }
        }

        if (bucketName) {
          const bucket = storage.bucket(bucketName)
          let deleted = false

          // Tentar extrair o nome do arquivo da URL
          if (imagemUrl.includes('storage.googleapis.com')) {
            try {
              const url = new URL(imagemUrl)
              const pathParts = url.pathname.split('/').filter(Boolean)
              
              // O primeiro elemento é o bucket, o resto é o caminho do arquivo
              if (pathParts.length >= 2) {
                const fileName = pathParts.slice(1).join('/') // Remove o bucket e pega o resto
                const fileRef = bucket.file(fileName)
                
                const [exists] = await fileRef.exists()
                if (exists) {
                  await fileRef.delete()
                  console.log(`✅ Imagem deletada do Storage (formato antigo): ${fileName}`)
                  deleted = true
                }
              }
            } catch (urlError) {
              console.log('Tentando deletar usando formato novo baseado no ID')
            }
          }

          // Se não deletou com o formato antigo, tentar o formato novo baseado no ID
          if (!deleted) {
            const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
            
            for (const ext of extensions) {
              const filePath = `questions/${id}/image.${ext}`
              const fileRef = bucket.file(filePath)
              
              try {
                const [exists] = await fileRef.exists()
                if (exists) {
                  await fileRef.delete()
                  console.log(`✅ Imagem deletada do Storage (formato novo): ${filePath}`)
                  deleted = true
                  break
                }
              } catch (err) {
                // Continuar tentando outras extensões
              }
            }
          }
          
          if (!deleted) {
            console.log(`⚠️ Arquivo não encontrado no Storage para questão ${id}`)
          }
        } else {
          console.log('⚠️ Bucket name não configurado, pulando deleção de imagem')
        }
      } catch (deleteError: any) {
        // Log do erro mas não falha a exclusão da questão
        console.error('Erro ao deletar imagem do Storage:', deleteError)
      }
    }

    // Excluir questão do histórico de todos os usuários
    let totalDeleted = 0
    let hasMore = true

    while (hasMore) {
      // Buscar até 500 registros de histórico por vez
      const historySnapshot = await db
        .collection('history')
        .where('questionId', '==', id)
        .limit(500)
        .get()

      if (historySnapshot.empty) {
        hasMore = false
        break
      }

      // Deletar em batch
      const batch = db.batch()
      historySnapshot.forEach((doc) => {
        batch.delete(doc.ref)
      })

      await batch.commit()
      totalDeleted += historySnapshot.size

      // Se retornou menos de 500, não há mais documentos
      if (historySnapshot.size < 500) {
        hasMore = false
      }
    }

    // Excluir a questão
    await docRef.delete()

    return NextResponse.json({ 
      success: true,
      deletedFromHistory: totalDeleted 
    })
  } catch (error: any) {
    console.error('Erro ao deletar questão:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar questão' },
      { status: 500 }
    )
  }
}

