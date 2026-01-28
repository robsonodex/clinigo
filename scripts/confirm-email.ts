/**
 * Script para confirmar email do usuário no Supabase Auth
 * Executar com: npx tsx confirm-email.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variáveis de ambiente não configuradas')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function confirmUserEmail(email: string) {
    console.log(`🔍 Buscando usuário: ${email}`)

    // 1. Buscar usuário no auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
        console.error('❌ Erro ao buscar usuários:', listError)
        return
    }

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (!user) {
        console.error(`❌ Usuário não encontrado: ${email}`)
        return
    }

    console.log(`✅ Usuário encontrado: ${user.id}`)
    console.log(`   Email confirmado: ${user.email_confirmed_at ? 'SIM' : 'NÃO'}`)

    if (user.email_confirmed_at) {
        console.log(`✅ Email já está confirmado desde: ${user.email_confirmed_at}`)
    } else {
        // 2. Confirmar email
        console.log(`🔄 Confirmando email...`)
        const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
            email_confirm: true
        })

        if (error) {
            console.error('❌ Erro ao confirmar email:', error)
            return
        }

        console.log(`✅ Email confirmado com sucesso!`)
    }

    // 3. Verificar status na tabela public.users
    const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .select('*, clinics(name, is_active, approval_status)')
        .eq('id', user.id)
        .single()

    if (publicError) {
        console.error('❌ Erro ao buscar usuário público:', publicError)
        return
    }

    console.log(`\n📊 Status do usuário:`)
    console.log(`   Nome: ${publicUser.full_name}`)
    console.log(`   Email: ${publicUser.email}`)
    console.log(`   Função: ${publicUser.role}`)
    console.log(`   Ativo: ${publicUser.is_active ? 'SIM' : 'NÃO'}`)
    console.log(`   Status: ${publicUser.activation_status}`)

    if (publicUser.clinics) {
        console.log(`\n🏥 Clínica:`)
        console.log(`   Nome: ${publicUser.clinics.name}`)
        console.log(`   Ativa: ${publicUser.clinics.is_active ? 'SIM' : 'NÃO'}`)
        console.log(`   Status: ${publicUser.clinics.approval_status}`)
    }

    console.log(`\n✅ Usuário pode fazer login agora!`)
}

// Executar
confirmUserEmail('robsonfenriz@hotmail.com')
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Erro inesperado:', err)
        process.exit(1)
    })
