import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/set-2fa-pending
 * Define um cookie indicando que o 2FA está pendente de verificação
 * Isso impede o acesso ao sistema até que o código seja verificado
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  
  // Define cookie indicando 2FA pendente (válido por 5 minutos)
  response.cookies.set('2fa-pending', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 5, // 5 minutos
    path: '/',
  })

  return response
}

/**
 * DELETE /api/auth/set-2fa-pending
 * Remove o cookie de 2FA pendente após verificação bem-sucedida
 */
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  
  // Usar os mesmos atributos do cookie original para garantir remoção correta
  response.cookies.set('2fa-pending', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // Expira imediatamente
    path: '/',
  })

  return response
}

