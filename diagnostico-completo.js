// ========================================
// 🧪 TESTE COMPLETO DE DIAGNÓSTICO GAS
// ========================================
// Cole este código no console do navegador (F12)

(async function diagnosticoCompleto() {
    console.clear();
    console.log('🧪 INICIANDO DIAGNÓSTICO COMPLETO DO GAS');
    console.log('=' .repeat(50));
    
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbyd3JdxPkWM2xhAUikFOXi0jVGwN1H4sqNg5fnc4iABGDAsSkFtpjOPY40EBLssYc_z/exec';
    const SITE_SLUG = 'LOUNGERIEAMAPAGARDEN';
    const VIP_PIN = '1234';
    
    let resultados = {
        conexao_basica: null,
        doGet_simples: null,
        doPost_feedback_list: null,
        doPost_feedback_submit: null,
        doPost_feedback_approve: null,
        doPost_client_api: null,
        erro_detalhado: null
    };
    
    // ========================================
    // 1. TESTE DE CONEXÃO BÁSICA
    // ========================================
    console.log('\n1️⃣ TESTE DE CONEXÃO BÁSICA');
    console.log('-'.repeat(30));
    
    try {
        const response = await fetch(GAS_URL, {
            method: 'GET',
            mode: 'cors'
        });
        
        resultados.conexao_basica = {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            ok: response.ok,
            redirected: response.redirected,
            url: response.url
        };
        
        console.log('✅ Conexão estabelecida');
        console.log('Status:', response.status, response.statusText);
        console.log('URL final:', response.url);
        
        if (response.redirected) {
            console.log('⚠️ ATENÇÃO: Redirecionamento detectado!');
        }
        
    } catch (error) {
        resultados.conexao_basica = { erro: error.message };
        console.log('❌ Erro de conexão:', error.message);
    }
    
    // ========================================
    // 2. TESTE doGet() SIMPLES
    // ========================================
    console.log('\n2️⃣ TESTE doGet() SIMPLES');
    console.log('-'.repeat(30));
    
    try {
        const response = await fetch(`${GAS_URL}?type=status&site=${SITE_SLUG}`, {
            method: 'GET',
            mode: 'cors'
        });
        
        const text = await response.text();
        
        resultados.doGet_simples = {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            content: text.substring(0, 500) // Primeiros 500 chars
        };
        
        console.log('Status:', response.status, response.statusText);
        
        if (text.includes('HTML')) {
            console.log('❌ Retornou HTML ao invés de JSON');
            console.log('Conteúdo:', text.substring(0, 200));
        } else {
            try {
                const json = JSON.parse(text);
                console.log('✅ Retornou JSON válido');
                console.log('Dados:', json);
            } catch (e) {
                console.log('❌ Não é JSON válido');
                console.log('Conteúdo:', text.substring(0, 200));
            }
        }
        
    } catch (error) {
        resultados.doGet_simples = { erro: error.message };
        console.log('❌ Erro:', error.message);
    }
    
    // ========================================
    // 3. TESTE doPost() - FEEDBACK LIST
    // ========================================
    console.log('\n3️⃣ TESTE doPost() - FEEDBACK LIST');
    console.log('-'.repeat(30));
    
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'feedback',
                action: 'list',
                site: SITE_SLUG
            })
        });
        
        const text = await response.text();
        
        resultados.doPost_feedback_list = {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            content: text.substring(0, 500)
        };
        
        console.log('Status:', response.status, response.statusText);
        console.log('Conteúdo:', text.substring(0, 200));
        
        if (text.includes('HTML')) {
            console.log('❌ Retornou HTML ao invés de JSON');
        } else {
            try {
                const json = JSON.parse(text);
                console.log('✅ Retornou JSON válido');
                console.log('Dados:', json);
            } catch (e) {
                console.log('❌ Não é JSON válido');
            }
        }
        
    } catch (error) {
        resultados.doPost_feedback_list = { erro: error.message };
        console.log('❌ Erro:', error.message);
    }
    
    // ========================================
    // 4. TESTE doPost() - FEEDBACK SUBMIT
    // ========================================
    console.log('\n4️⃣ TESTE doPost() - FEEDBACK SUBMIT');
    console.log('-'.repeat(30));
    
    try {
        const testFeedback = {
            name: 'Teste Diagnóstico',
            email: 'teste@diagnostico.com',
            phone: '11999999999',
            rating: 5,
            message: `Teste de diagnóstico - ${new Date().toISOString()}`
        };
        
        const response = await fetch(`${GAS_URL}?type=feedback&action=submit&site=${SITE_SLUG}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testFeedback)
        });
        
        const text = await response.text();
        
        resultados.doPost_feedback_submit = {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            content: text.substring(0, 500)
        };
        
        console.log('Status:', response.status, response.statusText);
        console.log('Conteúdo:', text.substring(0, 200));
        
        if (text.includes('HTML')) {
            console.log('❌ Retornou HTML ao invés de JSON');
        } else {
            try {
                const json = JSON.parse(text);
                console.log('✅ Retornou JSON válido');
                console.log('Dados:', json);
                
                if (json.ok) {
                    console.log('🎉 FEEDBACK ENVIADO COM SUCESSO!');
                    console.log('ID:', json.data?.id);
                } else {
                    console.log('❌ Erro no envio:', json.error);
                }
            } catch (e) {
                console.log('❌ Não é JSON válido');
            }
        }
        
    } catch (error) {
        resultados.doPost_feedback_submit = { erro: error.message };
        console.log('❌ Erro:', error.message);
    }
    
    // ========================================
    // 5. TESTE doPost() - CLIENT API
    // ========================================
    console.log('\n5️⃣ TESTE doPost() - CLIENT API');
    console.log('-'.repeat(30));
    
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'list_feedbacks_secure',
                site: SITE_SLUG,
                pin: VIP_PIN,
                page: 1,
                pageSize: 10
            })
        });
        
        const text = await response.text();
        
        resultados.doPost_client_api = {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            content: text.substring(0, 500)
        };
        
        console.log('Status:', response.status, response.statusText);
        console.log('Conteúdo:', text.substring(0, 200));
        
        if (text.includes('HTML')) {
            console.log('❌ Retornou HTML ao invés de JSON');
        } else {
            try {
                const json = JSON.parse(text);
                console.log('✅ Retornou JSON válido');
                console.log('Dados:', json);
                
                if (json.ok) {
                    console.log('📊 Total de feedbacks:', json.data?.total || 0);
                    console.log('📋 Feedbacks encontrados:', json.data?.items?.length || 0);
                } else {
                    console.log('❌ Erro na API:', json.error);
                }
            } catch (e) {
                console.log('❌ Não é JSON válido');
            }
        }
        
    } catch (error) {
        resultados.doPost_client_api = { erro: error.message };
        console.log('❌ Erro:', error.message);
    }
    
    // ========================================
    // 6. TESTE DE TODAS AS ROTAS POSSÍVEIS
    // ========================================
    console.log('\n6️⃣ TESTE DE TODAS AS ROTAS POSSÍVEIS');
    console.log('-'.repeat(30));
    
    const rotas = [
        { type: 'feedback', action: 'submit' },
        { type: 'feedback', action: 'list' },
        { type: 'feedback', action: 'approve' },
        { type: 'feedback', action: 'reject' },
        { type: 'feedback', action: 'get_public' },
        { action: 'list_feedbacks_secure' },
        { action: 'feedback_set_approval' },
        { action: 'publish_feedback_to_site' },
        { action: 'save_settings' },
        { action: 'get_settings' }
    ];
    
    for (const rota of rotas) {
        try {
            const url = rota.type ? 
                `${GAS_URL}?type=${rota.type}&action=${rota.action}&site=${SITE_SLUG}` :
                GAS_URL;
            
            const body = rota.type ? 
                {} : 
                { ...rota, site: SITE_SLUG, pin: VIP_PIN };
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            
            const text = await response.text();
            
            console.log(`${rota.type ? rota.type + '.' + rota.action : rota.action}:`, 
                       response.status, response.ok ? '✅' : '❌');
            
            if (text.includes('HTML')) {
                console.log('  → Retornou HTML');
            } else {
                try {
                    const json = JSON.parse(text);
                    if (json.ok) {
                        console.log('  → JSON OK');
                    } else {
                        console.log('  → Erro:', json.error);
                    }
                } catch (e) {
                    console.log('  → Não é JSON');
                }
            }
            
        } catch (error) {
            console.log(`${rota.type ? rota.type + '.' + rota.action : rota.action}: ❌ ${error.message}`);
        }
    }
    
    // ========================================
    // 7. RESUMO FINAL
    // ========================================
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMO DO DIAGNÓSTICO');
    console.log('='.repeat(50));
    
    console.log('🔗 URL do GAS:', GAS_URL);
    console.log('🏢 Site Slug:', SITE_SLUG);
    console.log('🔑 VIP PIN:', VIP_PIN);
    
    console.log('\n📋 RESULTADOS:');
    Object.entries(resultados).forEach(([teste, resultado]) => {
        if (resultado) {
            console.log(`${teste}:`, resultado.ok ? '✅' : '❌', resultado.erro || resultado.status || 'OK');
        }
    });
    
    console.log('\n📤 COPIE ESTE OBJETO PARA ME ENVIAR:');
    console.log('resultados =', JSON.stringify(resultados, null, 2));
    
    console.log('\n🎯 PRÓXIMOS PASSOS:');
    console.log('1. Copie o objeto "resultados" acima');
    console.log('2. Me envie o resultado');
    console.log('3. Verifique se há erros específicos');
    console.log('4. Teste as rotas que retornaram erro');
    
    return resultados;
    
})();

// ========================================
// 🛠️ FUNÇÃO AUXILIAR PARA TESTE MANUAL
// ========================================
function testarRotaEspecifica(tipo, acao, dados = {}) {
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbyd3JdxPkWM2xhAUikFOXi0jVGwN1H4sqNg5fnc4iABGDAsSkFtpjOPY40EBLssYc_z/exec';
    const SITE_SLUG = 'LOUNGERIEAMAPAGARDEN';
    
    const url = tipo ? 
        `${GAS_URL}?type=${tipo}&action=${acao}&site=${SITE_SLUG}` :
        GAS_URL;
    
    const body = tipo ? 
        dados : 
        { action: acao, site: SITE_SLUG, ...dados };
    
    console.log(`🧪 Testando: ${tipo ? tipo + '.' + acao : acao}`);
    console.log('URL:', url);
    console.log('Body:', body);
    
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(response => response.text())
    .then(text => {
        console.log('Resposta:', text);
        try {
            const json = JSON.parse(text);
            console.log('JSON:', json);
            return json;
        } catch (e) {
            console.log('Não é JSON válido');
            return { erro: 'Não é JSON', conteudo: text };
        }
    })
    .catch(error => {
        console.log('Erro:', error);
        return { erro: error.message };
    });
}

console.log('✅ Script de diagnóstico carregado!');
console.log('🚀 Execute: diagnosticoCompleto()');
console.log('🔧 Ou teste rota específica: testarRotaEspecifica("feedback", "list")');
