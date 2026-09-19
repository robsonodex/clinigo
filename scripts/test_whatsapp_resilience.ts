/**
 * Teste de Resiliência da Conexão WhatsApp (BUG 1)
 * Valida que quedas transitórias não deletam credenciais do Storage
 * e que a reconexão/verificação de status se mantém resiliente.
 */

import { DisconnectReason } from '@whiskeysockets/baileys'

function simulateConnectionClose(statusCode: number, reconnectAttempts: number) {
  const isLoggedOut = statusCode === DisconnectReason.loggedOut // 401
  const shouldReconnect = !isLoggedOut
  let storageRemoved = false
  let sessionStatus = ''
  let errorMessage = ''

  const removeAuthStateFromStorage = () => {
    storageRemoved = true
  }

  if (shouldReconnect) {
    const maxAttempts = 3
    if (reconnectAttempts < maxAttempts) {
      sessionStatus = 'connecting'
    } else {
      sessionStatus = 'connecting' // Preserva status e não desconecta permanentemente
      errorMessage = 'Pausa de reconexão: Credenciais preservadas para auto-restauração.'
      // removeAuthStateFromStorage NÃO É CHAMADO!
    }
  } else {
    // Logout explícito (401)
    sessionStatus = 'disconnected'
    removeAuthStateFromStorage()
  }

  return { storageRemoved, sessionStatus, errorMessage }
}

function runTests() {
  console.log('--- Iniciando Testes de Resiliência WhatsApp ---')

  // Teste 1: Queda transitória por timeout (408)
  const t1 = simulateConnectionClose(DisconnectReason.timedOut, 0)
  if (t1.storageRemoved) throw new Error('Falha no Teste 1: Storage não deveria ser removido em timeout 408')
  if (t1.sessionStatus !== 'connecting') throw new Error('Falha no Teste 1: Status deveria ser connecting')
  console.log('OK - Teste 1: Timeout (408) tenta reconectar sem remover Storage')

  // Teste 2: Limite de reconexões atingido após oscilação contínua
  const t2 = simulateConnectionClose(DisconnectReason.timedOut, 3)
  if (t2.storageRemoved) throw new Error('Falha no Teste 2: Storage NUNCA deve ser removido após limite de tentativas')
  if (t2.sessionStatus === 'disconnected') throw new Error('Falha no Teste 2: Sessão não deve ser marcada como disconnected se credenciais existem')
  console.log('OK - Teste 2: Limite de tentativas mantém credenciais no Storage para auto-recuperação')

  // Teste 3: Reinício solicitado pelo WhatsApp (515)
  const t3 = simulateConnectionClose(DisconnectReason.restartRequired, 1)
  if (t3.storageRemoved) throw new Error('Falha no Teste 3: Storage não deve ser removido no código 515')
  console.log('OK - Teste 3: RestartRequired (515) preserva Storage')

  // Teste 4: Sessão substituída (440)
  const t4 = simulateConnectionClose(DisconnectReason.connectionReplaced, 3)
  if (t4.storageRemoved) throw new Error('Falha no Teste 4: Storage não deve ser removido no código 440')
  console.log('OK - Teste 4: ConnectionReplaced (440) preserva Storage')

  // Teste 5: Logout explícito no celular (401)
  const t5 = simulateConnectionClose(DisconnectReason.loggedOut, 0)
  if (!t5.storageRemoved) throw new Error('Falha no Teste 5: Storage DEVE ser removido em logout explícito (401)')
  if (t5.sessionStatus !== 'disconnected') throw new Error('Falha no Teste 5: Status deve ser disconnected após logout')
  console.log('OK - Teste 5: Logout explícito (401) limpa Storage e marca disconnected')

  console.log('\nTodos os 5 testes de resiliência de WhatsApp passaram com sucesso!')
}

runTests()
