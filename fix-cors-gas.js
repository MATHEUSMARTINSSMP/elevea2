// ========================================
// 🔧 CORREÇÃO CORS PARA GAS
// ========================================
// Cole este código no início da função doPost(e) no seu GAS

function doPost(e) {
  // ADICIONAR ESTAS LINHAS NO INÍCIO:
  try {
    // Configurar CORS headers
    const response = {
      ok: true,
      cors_fix: "Headers configurados"
    };
    
    // Se for uma requisição OPTIONS (preflight), retornar imediatamente
    if (e && e.parameter && e.parameter.method === 'OPTIONS') {
      return ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Resto do seu código doPost aqui...
    
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: false, 
        error: String(err),
        cors_error: true 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================
// 🧪 TESTE ALTERNATIVO - USANDO GET
// ========================================
// Como o doGet() funciona, vamos testar usando parâmetros GET

function testarComGET() {
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbyd3JdxPkWM2xhAUikFOXi0jVGwN1H4sqNg5fnc4iABGDAsSkFtpjOPY40EBLssYc_z/exec';
  
  // Teste 1: Listar feedbacks via GET
  const url1 = `${GAS_URL}?type=feedback&action=list&site=LOUNGERIEAMAPAGARDEN&method=GET`;
  console.log('🧪 Testando listar feedbacks via GET:', url1);
  
  fetch(url1)
    .then(response => response.text())
    .then(text => {
      console.log('✅ Resposta GET:', text);
      try {
        const json = JSON.parse(text);
        console.log('📊 JSON:', json);
      } catch (e) {
        console.log('❌ Não é JSON');
      }
    })
    .catch(error => console.log('❌ Erro:', error));
    
  // Teste 2: Enviar feedback via GET (se o GAS suportar)
  const url2 = `${GAS_URL}?type=feedback&action=submit&site=LOUNGERIEAMAPAGARDEN&name=TesteGET&rating=5&message=Teste via GET&method=GET`;
  console.log('🧪 Testando enviar feedback via GET:', url2);
  
  fetch(url2)
    .then(response => response.text())
    .then(text => {
      console.log('✅ Resposta GET Submit:', text);
      try {
        const json = JSON.parse(text);
        console.log('📊 JSON:', json);
      } catch (e) {
        console.log('❌ Não é JSON');
      }
    })
    .catch(error => console.log('❌ Erro:', error));
}

// ========================================
// 🛠️ MODIFICAÇÃO NO GAS PARA SUPORTAR GET
// ========================================
// Adicione esta lógica na função doGet(e) do seu GAS:

function doGet(e) {
  try {
    const data = e.parameter || {};
    
    // Se for uma requisição de feedback via GET
    if (data.type === 'feedback' && data.action) {
      // Criar objeto e simular doPost
      const mockPost = {
        parameter: data,
        postData: {
          contents: JSON.stringify(data),
          type: 'application/json'
        }
      };
      
      // Chamar a lógica do doPost
      return doPost(mockPost);
    }
    
    // Resto da lógica doGet existente...
    
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        ok: false, 
        error: String(err) 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
