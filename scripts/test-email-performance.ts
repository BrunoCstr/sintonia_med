/**
 * Script de Teste de Performance de E-mail
 * 
 * Use este script para testar se as otimizações estão funcionando
 * e medir o tempo real de envio de e-mails.
 * 
 * Como usar:
 * 1. Configure as variáveis de ambiente (EMAIL_USER, EMAIL_PASSWORD)
 * 2. Execute: npx tsx scripts/test-email-performance.ts
 * 3. Verifique os tempos reportados
 * 
 * Tempos esperados:
 * - Antes das otimizações: 8-15s
 * - Depois das otimizações: 3-6s
 */

import { sendVerificationEmail } from '../lib/email'

// Cores para o terminal
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}

function log(color: string, message: string) {
  console.log(`${color}${message}${colors.reset}`)
}

async function testEmailPerformance() {
  log(colors.bold + colors.cyan, '\n🚀 Teste de Performance de E-mail - SintoniaMed\n')
  log(colors.yellow, '=' .repeat(60))

  // Verificar variáveis de ambiente
  log(colors.blue, '\n📋 Verificando configuração...')
  
  const emailUser = process.env.EMAIL_USER
  const emailPassword = process.env.EMAIL_PASSWORD

  if (!emailUser || !emailPassword) {
    log(colors.red, '\n❌ ERRO: Variáveis de ambiente não configuradas!')
    log(colors.yellow, '\nConfigure:')
    log(colors.reset, '  EMAIL_USER=seu-email@gmail.com')
    log(colors.reset, '  EMAIL_PASSWORD=sua-senha-de-aplicativo')
    process.exit(1)
  }

  log(colors.green, `✅ EMAIL_USER: ${emailUser}`)
  log(colors.green, `✅ EMAIL_PASSWORD: ${'*'.repeat(16)}`)

  // Email de teste
  const testEmail = process.argv[2] || emailUser
  log(colors.blue, `\n📧 E-mail de teste: ${testEmail}`)
  
  // Link de verificação falso para teste
  const fakeVerificationLink = 'https://sintoniamed.com/verify?code=test123'

  // Teste 1: Primeiro envio (sem cache)
  log(colors.yellow, '\n' + '='.repeat(60))
  log(colors.bold, '\n🧪 TESTE 1: Primeiro envio (criação de transporter)\n')
  
  const start1 = Date.now()
  
  try {
    await sendVerificationEmail(testEmail, fakeVerificationLink)
    const time1 = ((Date.now() - start1) / 1000).toFixed(2)
    
    log(colors.green, `✅ E-mail enviado com sucesso!`)
    log(colors.cyan, `⏱️  Tempo: ${time1}s`)
    
    // Avaliar resultado
    const time1Num = parseFloat(time1)
    if (time1Num < 5) {
      log(colors.green, `✨ EXCELENTE! Muito rápido!`)
    } else if (time1Num < 8) {
      log(colors.yellow, `⚠️  BOM, mas pode melhorar. Esperado < 5s.`)
    } else {
      log(colors.red, `❌ LENTO! Deveria ser < 5s. Verifique otimizações.`)
    }

    // Aguardar um pouco antes do próximo teste
    log(colors.blue, '\n⏳ Aguardando 2 segundos...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Teste 2: Segundo envio (com cache)
    log(colors.yellow, '\n' + '='.repeat(60))
    log(colors.bold, '\n🧪 TESTE 2: Segundo envio (com cache de transporter)\n')
    
    const start2 = Date.now()
    await sendVerificationEmail(testEmail, fakeVerificationLink)
    const time2 = ((Date.now() - start2) / 1000).toFixed(2)
    
    log(colors.green, `✅ E-mail enviado com sucesso!`)
    log(colors.cyan, `⏱️  Tempo: ${time2}s`)
    
    // Avaliar melhoria
    const time2Num = parseFloat(time2)
    const improvement = ((time1Num - time2Num) / time1Num * 100).toFixed(1)
    
    if (time2Num < time1Num) {
      log(colors.green, `✨ Cache funcionando! ${improvement}% mais rápido`)
    } else {
      log(colors.yellow, `⚠️  Cache pode não estar funcionando corretamente`)
    }

    // Teste 3: Múltiplos envios
    log(colors.yellow, '\n' + '='.repeat(60))
    log(colors.bold, '\n🧪 TESTE 3: Múltiplos envios sequenciais (pool de conexões)\n')
    
    const times: number[] = []
    const numTests = 5
    
    for (let i = 1; i <= numTests; i++) {
      log(colors.blue, `Enviando ${i}/${numTests}...`)
      const startN = Date.now()
      await sendVerificationEmail(testEmail, fakeVerificationLink)
      const timeN = (Date.now() - startN) / 1000
      times.push(timeN)
      log(colors.green, `  ✅ ${timeN.toFixed(2)}s`)
    }

    const avgTime = (times.reduce((a, b) => a + b) / times.length).toFixed(2)
    const minTime = Math.min(...times).toFixed(2)
    const maxTime = Math.max(...times).toFixed(2)

    log(colors.cyan, `\n📊 Estatísticas:`)
    log(colors.reset, `  Média: ${avgTime}s`)
    log(colors.reset, `  Mínimo: ${minTime}s`)
    log(colors.reset, `  Máximo: ${maxTime}s`)

    if (parseFloat(avgTime) < 5) {
      log(colors.green, `\n✨ Pool de conexões funcionando perfeitamente!`)
    } else {
      log(colors.yellow, `\n⚠️  Pool pode não estar otimizado. Média deveria ser < 5s`)
    }

    // Relatório final
    log(colors.yellow, '\n' + '='.repeat(60))
    log(colors.bold + colors.cyan, '\n📊 RELATÓRIO FINAL\n')
    
    log(colors.reset, `1° envio (sem cache):  ${time1}s`)
    log(colors.reset, `2° envio (com cache):  ${time2}s`)
    log(colors.reset, `Média de ${numTests} envios:    ${avgTime}s`)
    
    const overallAvg = parseFloat(avgTime)
    
    log(colors.yellow, '\n' + '='.repeat(60))
    log(colors.bold, '\n🎯 AVALIAÇÃO GERAL:\n')
    
    if (overallAvg < 4) {
      log(colors.green, '✅✅✅ EXCELENTE!')
      log(colors.green, 'Otimizações funcionando perfeitamente!')
      log(colors.green, 'E-mails estão sendo enviados muito rapidamente.')
    } else if (overallAvg < 6) {
      log(colors.green, '✅✅ MUITO BOM!')
      log(colors.green, 'Otimizações aplicadas com sucesso!')
      log(colors.yellow, 'Velocidade está boa, dentro do esperado.')
    } else if (overallAvg < 10) {
      log(colors.yellow, '⚠️  REGULAR')
      log(colors.yellow, 'Otimizações podem não estar totalmente aplicadas.')
      log(colors.yellow, 'Verifique se o código foi atualizado corretamente.')
    } else {
      log(colors.red, '❌ LENTO!')
      log(colors.red, 'Otimizações NÃO estão funcionando.')
      log(colors.red, 'Revise o código e verifique se todas as mudanças foram aplicadas.')
    }

    log(colors.yellow, '\n' + '='.repeat(60))
    log(colors.cyan, '\n📝 RECOMENDAÇÕES:\n')
    
    if (overallAvg < 6) {
      log(colors.green, '✅ Sistema pronto para produção!')
      log(colors.reset, '  - Deploy imediato recomendado')
      log(colors.reset, '  - Monitore reclamações de usuários')
      log(colors.reset, '  - Se > 20% reclamarem, considere Resend')
    } else {
      log(colors.yellow, '⚠️  Melhorias necessárias:')
      log(colors.reset, '  1. Verifique se transporter.verify() foi removido')
      log(colors.reset, '  2. Confirme que cache está implementado')
      log(colors.reset, '  3. Verifique pool: true nas configurações')
      log(colors.reset, '  4. Considere migrar para Resend imediatamente')
    }

    log(colors.yellow, '\n' + '='.repeat(60))
    log(colors.cyan, '\n💡 PRÓXIMOS PASSOS:\n')
    log(colors.reset, '1. Teste criar uma conta real no sistema')
    log(colors.reset, '2. Verifique quanto tempo leva para o e-mail chegar')
    log(colors.reset, '3. Monitore logs de produção por 1 semana')
    log(colors.reset, '4. Colete feedback dos usuários')
    log(colors.reset, '5. Migre para Resend se necessário')
    
    log(colors.green, '\n✅ Teste concluído com sucesso!\n')

  } catch (error: any) {
    log(colors.red, `\n❌ ERRO: ${error.message}`)
    
    if (error.message.includes('BadCredentials') || error.message.includes('Password')) {
      log(colors.yellow, '\n💡 Dica:')
      log(colors.reset, '  - Certifique-se de usar uma senha de aplicativo do Gmail')
      log(colors.reset, '  - Não use sua senha normal do Gmail')
      log(colors.reset, '  - Gere em: https://myaccount.google.com/apppasswords')
    }
    
    process.exit(1)
  }
}

// Executar teste
testEmailPerformance().catch(console.error)

/**
 * BENCHMARKS ESPERADOS:
 * 
 * ANTES DAS OTIMIZAÇÕES:
 * - 1° envio: 10-15s
 * - 2° envio: 8-12s
 * - Média: 10-13s
 * 
 * DEPOIS DAS OTIMIZAÇÕES:
 * - 1° envio: 4-6s
 * - 2° envio: 3-5s
 * - Média: 3-5s
 * 
 * COM RESEND:
 * - 1° envio: 1-2s
 * - 2° envio: 1-2s
 * - Média: 1-2s
 */


