// ========================================
// 🧪 TESTE APÓS CORREÇÃO CORS
// ========================================
// Cole este código no console do navegador APÓS aplicar a correção no GAS

(async function testeAposCorrecao() {
    console.clear();
    console.log('🧪 TESTANDO APÓS CORREÇÃO CORS');
    console.log('=' .repeat(40));
    
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbyd3JdxPkWM2xhAUikFOXi0jVGwN1H4sqNg5fnc4iABGDAsSkFtpjOPY40EBLssYc_z/exec';
    const SITE_SLUG = 'LOUNGERIEAMAPAGARDEN';
    const VIP_PIN = '1234';
    
    // ========================================
    // 1. TESTE: LISTAR FEEDBACKS VIA GET
    // ========================================
    console.log('\n1️⃣ TESTE: Listar Feedbacks via GET');
    console.log('-'.repeat(30));
    
    try {
        const url = `${GAS_URL}?type=feedback&action=list&site=${SITE_SLUG}`;
        console.log('🔗 URL:', url);
        
        const response = await fetch(url);
        const text = await response.text();
        
        console.log('📊 Status:', response.status, response.statusText);
        console.log('📝 Resposta:', text);
        
        if (text.includes('HTML')) {
            console.log('❌ Ainda retorna HTML - problema não resolvido');
        } else {
            try {
                const json = JSON.parse(text);
                console.log('✅ JSON válido!');
                console.log('📋 Dados:', json);
                
                if (json.ok) {
                    console.log('🎉 SUCESSO! Feedbacks carregados');
                    console.log('📊 Total:', json.data?.total || 0);
                    console.log('📋 Items:', json.data?.items?.length || 0);
                } else {
                    console.log('❌ Erro na resposta:', json.error);
                }
            } catch (e) {
                console.log('❌ Não é JSON válido');
            }
        }
        
    } catch (error) {
        console.log('❌ Erro de rede:', error.message);
    }
    
    // ========================================
    // 2. TESTE: ENVIAR FEEDBACK VIA GET
    // ========================================
    console.log('\n2️⃣ TESTE: Enviar Feedback via GET');
    console.log('-'.repeat(30));
    
    try {
        const feedbackData = {
            name: 'Teste CORS Fix',
            email: 'teste@cors.com',
            phone: '11999999999',
            rating: 5,
            message: `Teste após correção CORS - ${new Date().toISOString()}`
        };
        
        // Converter dados para parâmetros GET
        const params = new URLSearchParams();
        params.append('type', 'feedback');
        params.append('action', 'submit');
        params.append('site', SITE_SLUG);
        Object.entries(feedbackData).forEach(([key, value]) => {
            params.append(key, value);
        });
        
        const url = `${GAS_URL}?${params.toString()}`;
        console.log('🔗 URL:', url);
        
        const response = await fetch(url);
        const text = await response.text();
        
        console.log('📊 Status:', response.status, response.statusText);
        console.log('📝 Resposta:', text);
        
        if (text.includes('HTML')) {
            console.log('❌ Ainda retorna HTML - problema não resolvido');
        } else {
            try {
                const json = JSON.parse(text);
                console.log('✅ JSON válido!');
                console.log('📋 Dados:', json);
                
                if (json.ok) {
                    console.log('🎉 SUCESSO! Feedback enviado');
                    console.log('🆔 ID:', json.data?.id);
                    console.log('📊 Status:', json.data?.status);
                } else {
                    console.log('❌ Erro no envio:', json.error);
                }
            } catch (e) {
                console.log('❌ Não é JSON válido');
            }
        }
        
    } catch (error) {
        console.log('❌ Erro de rede:', error.message);
    }
    
    // ========================================
    // 3. TESTE: CLIENT API VIA GET
    // ========================================
    console.log('\n3️⃣ TESTE: Client API via GET');
    console.log('-'.repeat(30));
    
    try {
        const url = `${GAS_URL}?action=list_feedbacks_secure&site=${SITE_SLUG}&pin=${VIP_PIN}&page=1&pageSize=10`;
        console.log('🔗 URL:', url);
        
        const response = await fetch(url);
        const text = await response.text();
        
        console.log('📊 Status:', response.status, response.statusText);
        console.log('📝 Resposta:', text);
        
        if (text.includes('HTML')) {
            console.log('❌ Ainda retorna HTML - problema não resolvido');
        } else {
            try {
                const json = JSON.parse(text);
                console.log('✅ JSON válido!');
                console.log('📋 Dados:', json);
                
                if (json.ok) {
                    console.log('🎉 SUCESSO! Client API funcionando');
                    console.log('📊 Total:', json.data?.total || 0);
                    console.log('📋 Items:', json.data?.items?.length || 0);
                } else {
                    console.log('❌ Erro na API:', json.error);
                }
            } catch (e) {
                console.log('❌ Não é JSON válido');
            }
        }
        
    } catch (error) {
        console.log('❌ Erro de rede:', error.message);
    }
    
    // ========================================
    // 4. RESUMO FINAL
    // ========================================
    console.log('\n' + '='.repeat(40));
    console.log('📊 RESUMO DOS TESTES');
    console.log('='.repeat(40));
    
    console.log('✅ Se todos os testes retornaram JSON válido:');
    console.log('   → Problema CORS RESOLVIDO!');
    console.log('   → Feedbacks devem aparecer no dashboard');
    console.log('   → Sistema funcionando normalmente');
    
    console.log('\n❌ Se ainda retornam HTML:');
    console.log('   → Problema não foi resolvido');
    console.log('   → Verificar se a correção foi aplicada no GAS');
    console.log('   → Fazer novo deploy se necessário');
    
    console.log('\n🎯 PRÓXIMOS PASSOS:');
    console.log('1. Verificar se feedbacks aparecem no dashboard');
    console.log('2. Testar aprovação de feedbacks');
    console.log('3. Testar publicação no site');
    
})();

// ========================================
// 🛠️ FUNÇÃO PARA TESTE MANUAL
// ========================================
function testarFeedbackViaGET(nome, email, telefone, rating, mensagem) {
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbyd3JdxPkWM2xhAUikFOXi0jVGwN1H4sqNg5fnc4iABGDAsSkFtpjOPY40EBLssYc_z/exec';
    const SITE_SLUG = 'LOUNGERIEAMAPAGARDEN';
    
    const params = new URLSearchParams();
    params.append('type', 'feedback');
    params.append('action', 'submit');
    params.append('site', SITE_SLUG);
    params.append('name', nome);
    params.append('email', email);
    params.append('phone', telefone);
    params.append('rating', rating);
    params.append('message', mensagem);
    
    const url = `${GAS_URL}?${params.toString()}`;
    
    console.log('🧪 Enviando feedback via GET...');
    console.log('🔗 URL:', url);
    
    return fetch(url)
        .then(response => response.text())
        .then(text => {
            console.log('📝 Resposta:', text);
            try {
                const json = JSON.parse(text);
                console.log('📊 JSON:', json);
                return json;
            } catch (e) {
                console.log('❌ Não é JSON');
                return { erro: 'Não é JSON', conteudo: text };
            }
        })
        .catch(error => {
            console.log('❌ Erro:', error);
            return { erro: error.message };
        });
}

console.log('✅ Script de teste carregado!');
console.log('🚀 Execute: testeAposCorrecao()');
console.log('🔧 Ou teste manual: testarFeedbackViaGET("Nome", "email@teste.com", "11999999999", 5, "Mensagem")');
