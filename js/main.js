// Configuração de máscaras
$(document).ready(function() {
    $('#cpf_responsavel').mask('000.000.000-00');
    $('#telefone_responsavel').mask('(00) 00000-0000');
    
    // Inicialização
    initializeForm();
    setupEventListeners();
});

// Inicialização do formulário
function initializeForm() {
    // Verifica token de matrícula na URL
    const urlParams = new URLSearchParams(window.location.search);
    const matriculaToken = urlParams.get('matricula');
    
    if (matriculaToken) {
        document.getElementById('matricula').value = matriculaToken;
        preencherFormularioViaWebhook(matriculaToken);
    }

    // Carrega dados dinâmicos
    carregarCursosEContraturnos();
    carregarPlanosEDescontos();
}

// Carregar cursos e contraturnos do precos.json
async function carregarCursosEContraturnos() {
    try {
        const response = await fetch('precos.json');
        const data = await response.json();
        
        const cursos = Object.entries(data.cursos).map(([id, curso]) => ({
            id,
            ...curso
        }));

        // Separa contraturnos e cursos
        const contraturnos = cursos.filter(c => c.categoria === 'contraturno');
        const cursosSemContraturno = cursos.filter(c => c.categoria === 'curso');

        // Atualiza o template do aprendiz
        atualizarTemplateAprendiz(contraturnos, cursosSemContraturno);
    } catch (error) {
        console.error('Erro ao carregar cursos:', error);
        alert('Erro ao carregar os cursos. Por favor, tente novamente.');
    }
}

// Carregar planos e descontos
async function carregarPlanosEDescontos() {
    try {
        const response = await fetch('precos.json');
        const data = await response.json();
        
        // Renderiza planos de pagamento
        renderizarPlanosPagamento(data.planos);
        
        // Renderiza opções de desconto
        renderizarOpcoesDesconto(data.descontos);
    } catch (error) {
        console.error('Erro ao carregar planos e descontos:', error);
        alert('Erro ao carregar as opções de pagamento. Por favor, tente novamente.');
    }
}

// Atualizar template do aprendiz com cursos
function atualizarTemplateAprendiz(contraturnos, cursos) {
    const template = document.getElementById('aprendiz-template');
    const select = template.content.querySelector('.curso-select');
    
    // Limpa opções existentes
    select.innerHTML = '';
    
    // Adiciona contraturnos
    if (contraturnos.length > 0) {
        const optgroupContraturno = document.createElement('optgroup');
        optgroupContraturno.label = 'Contraturnos';
        
        contraturnos.forEach(curso => {
            const option = document.createElement('option');
            option.value = curso.id;
            option.textContent = `${curso.nome} - R$ ${curso.preco.toFixed(2)}`;
            optgroupContraturno.appendChild(option);
        });
        
        select.appendChild(optgroupContraturno);
    }
    
    // Adiciona cursos
    if (cursos.length > 0) {
        const optgroupCursos = document.createElement('optgroup');
        optgroupCursos.label = 'Cursos';
        
        cursos.forEach(curso => {
            const option = document.createElement('option');
            option.value = curso.id;
            option.textContent = `${curso.nome} - R$ ${curso.preco.toFixed(2)}`;
            optgroupCursos.appendChild(option);
        });
        
        select.appendChild(optgroupCursos);
    }
}

// Renderizar planos de pagamento
function renderizarPlanosPagamento(planos) {
    const container = document.querySelector('.radio-cards');
    if (!container) {
        console.error('Container .radio-cards não encontrado');
        return;
    }
    
    container.innerHTML = '';
    
    Object.entries(planos).forEach(([id, plano]) => {
        const radioCard = document.createElement('div');
        radioCard.className = 'radio-card';
        
        radioCard.innerHTML = `
            <input type="radio" id="plano_${id}" name="plano_pagamento" value="${id}" required>
            <label for="plano_${id}">
                <div class="radio-card-header">
                    <h4>${plano.nome}</h4>
                    <span class="price">Multiplicador: ${plano.valor}</span>
                </div>
                <p class="radio-card-description">${plano.descricao}</p>
            </label>
        `;
        
        container.appendChild(radioCard);
    });
    
    // Adiciona event listener para atualizar valores
    container.addEventListener('change', atualizarValores);
}

// Renderizar opções de desconto
function renderizarOpcoesDesconto(descontos) {
    const select = document.getElementById('desconto');
    if (!select) {
        console.error('Select #desconto não encontrado');
        return;
    }
    
    // Limpa opções existentes (mantém a primeira)
    const firstOption = select.firstElementChild;
    select.innerHTML = '';
    if (firstOption) {
        select.appendChild(firstOption);
    }
    
    Object.entries(descontos).forEach(([id, desconto]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${desconto.nome} - ${desconto.percentual}% de desconto`;
        select.appendChild(option);
    });
    
    // Adiciona event listener para atualizar valores
    select.addEventListener('change', atualizarValores);
}

// Configuração de event listeners
function setupEventListeners() {
    // Adicionar/Remover aprendiz
    const addAprendizBtn = document.getElementById('add-aprendiz');
    if (addAprendizBtn) {
        addAprendizBtn.addEventListener('click', adicionarAprendiz);
    }
    
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-aprendiz')) {
            removerAprendiz(e.target.closest('.aprendiz-card'));
        }
    });

    // Aplicar cupom
    const aplicarCupomBtn = document.getElementById('aplicar-cupom');
    if (aplicarCupomBtn) {
        aplicarCupomBtn.addEventListener('click', aplicarCupom);
    }

    // Submit do formulário
    const form = document.getElementById('personal-info-form');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
    
    // Adiciona o primeiro aprendiz automaticamente
    setTimeout(() => {
        adicionarAprendiz();
    }, 500);
}

// Manipulação de aprendizes
function adicionarAprendiz() {
    const template = document.getElementById('aprendiz-template');
    const container = document.getElementById('aprendizes-container');
    
    if (!template || !container) {
        console.error('Template ou container de aprendizes não encontrado');
        return;
    }
    
    const clone = template.content.cloneNode(true);
    
    // Atualiza o número do aprendiz
    const numero = container.children.length + 1;
    clone.querySelector('.aprendiz-numero').textContent = numero;
    
    container.appendChild(clone);
    atualizarValores();
}

function removerAprendiz(card) {
    if (!card) return;
    
    const container = document.getElementById('aprendizes-container');
    if (container.children.length <= 1) {
        alert('É necessário ter pelo menos um aprendiz');
        return;
    }
    
    card.remove();
    
    // Atualiza numeração dos aprendizes restantes
    document.querySelectorAll('.aprendiz-numero').forEach((span, index) => {
        span.textContent = index + 1;
    });
    
    atualizarValores();
}

// Aplicar cupom de desconto
async function aplicarCupom() {
    const cupomInput = document.getElementById('cupom');
    const cupomMessage = document.getElementById('cupom-message');
    
    if (!cupomInput || !cupomMessage) {
        console.error('Elementos de cupom não encontrados');
        return;
    }
    
    const cupomValue = cupomInput.value.trim();
    
    if (!cupomValue) {
        cupomMessage.textContent = 'Digite um cupom válido';
        cupomMessage.className = 'cupom-message error';
        return;
    }
    
    try {
        // Simula validação do cupom (substitua pela sua API)
        const cuponsValidos = {
            'DESCONTO10': 10,
            'PROMO15': 15,
            'FAMILIA20': 20,
            'BEMVINDO': 5,
            'NATAL2024': 25
        };
        
        if (cuponsValidos[cupomValue.toUpperCase()]) {
            const desconto = cuponsValidos[cupomValue.toUpperCase()];
            cupomMessage.textContent = `Cupom aplicado! Desconto de ${desconto}%`;
            cupomMessage.className = 'cupom-message success';
            cupomInput.dataset.desconto = desconto;
            atualizarValores();
        } else {
            cupomMessage.textContent = 'Cupom inválido';
            cupomMessage.className = 'cupom-message error';
            cupomInput.dataset.desconto = '';
        }
    } catch (error) {
        console.error('Erro ao validar cupom:', error);
        cupomMessage.textContent = 'Erro ao validar cupom';
        cupomMessage.className = 'cupom-message error';
    }
}

// Validação da Etapa 1
function validarEtapa1() {
    // Validação do CPF
    const cpf = document.getElementById('cpf_responsavel').value;
    if (!validarCPF(cpf)) {
        mostrarErro('cpf-error', 'CPF inválido');
        return false;
    }

    // Validação de campos obrigatórios
    const camposObrigatorios = [
        'nome_responsavel',
        'email_responsavel',
        'telefone_responsavel'
    ];

    for (const campo of camposObrigatorios) {
        const elemento = document.getElementById(campo);
        if (!elemento || !elemento.value.trim()) {
            if (elemento) elemento.classList.add('input-error');
            return false;
        }
    }

    // Validação de "Como ficou sabendo"
    const comoConheceu = document.querySelectorAll('input[name="como_conheceu[]"]:checked');
    if (comoConheceu.length === 0) {
        alert('Por favor, selecione como ficou sabendo sobre o Quintal das Artes');
        return false;
    }

    // Validação de aprendizes
    const aprendizes = document.querySelectorAll('.aprendiz-card');
    if (aprendizes.length === 0) {
        alert('Por favor, adicione pelo menos um aprendiz');
        return false;
    }

    // Validação de plano de pagamento
    const planoSelecionado = document.querySelector('input[name="plano_pagamento"]:checked');
    if (!planoSelecionado) {
        alert('Por favor, selecione um plano de pagamento');
        return false;
    }

    return true;
}

// Validar etapa 2 (termos e condições)
function validarEtapa2() {
    const termosAceitos = document.querySelector('input[name="aceite_termos"]:checked');
    if (!termosAceitos) {
        alert('Por favor, aceite os termos e condições');
        return false;
    }
    
    const autorizacaoImagem = document.querySelector('input[name="autorizacao_imagem"]:checked');
    if (!autorizacaoImagem) {
        alert('Por favor, selecione uma opção para autorização de uso de imagem');
        return false;
    }
    
    return true;
}

// Coletar dados do formulário
function coletarDadosFormulario() {
    const formData = {
        matricula: document.getElementById('matricula')?.value || '',
        responsavel: {
            nome: document.getElementById('nome_responsavel')?.value || '',
            cpf: document.getElementById('cpf_responsavel')?.value || '',
            email: document.getElementById('email_responsavel')?.value || '',
            telefone: document.getElementById('telefone_responsavel')?.value || ''
        },
        aprendizes: [],
        como_conheceu: Array.from(document.querySelectorAll('input[name="como_conheceu[]"]:checked')).map(cb => cb.value),
        plano_pagamento: document.querySelector('input[name="plano_pagamento"]:checked')?.value || '',
        desconto: document.getElementById('desconto')?.value || '',
        cupom: document.getElementById('cupom')?.value || '',
        cupom_desconto: document.getElementById('cupom')?.dataset?.desconto || '',
        aceite_termos: document.querySelector('input[name="aceite_termos"]:checked') ? true : false,
        autorizacao_imagem: document.querySelector('input[name="autorizacao_imagem"]:checked')?.value || ''
    };
    
    // Coleta dados dos aprendizes
    document.querySelectorAll('.aprendiz-card').forEach(card => {
        const nomeInput = card.querySelector('input[name="nome_aprendiz[]"]');
        const dataInput = card.querySelector('input[name="data_nascimento_aprendiz[]"]');
        const cursosSelect = card.querySelector('select[name="cursos_aprendiz[]"]');
        
        if (nomeInput && dataInput && cursosSelect) {
            const aprendiz = {
                nome: nomeInput.value,
                data_nascimento: dataInput.value,
                cursos: Array.from(cursosSelect.selectedOptions).map(option => option.value)
            };
            formData.aprendizes.push(aprendiz);
        }
    });
    
    return formData;
}

// Atualizar valores
function atualizarValores() {
    try {
        const detalhesMatricula = coletarDadosFormulario();
        const valorTotal = calcularValorTotal(detalhesMatricula);
        
        // Atualiza campos ocultos se existirem
        const valorTotalInput = document.getElementById('valor_calculado_total');
        if (valorTotalInput) {
            valorTotalInput.value = valorTotal;
        }
        
        const detalhesInput = document.getElementById('detalhes_matricula');
        if (detalhesInput) {
            detalhesInput.value = JSON.stringify(detalhesMatricula);
        }
        
        atualizarResumoValores(valorTotal, detalhesMatricula);
    } catch (error) {
        console.error('Erro ao atualizar valores:', error);
    }
}

// Atualizar resumo de valores
function atualizarResumoValores(valorTotal, detalhes) {
    const container = document.getElementById('valores-container');
    if (!container) return;
    
    let html = '<div class="valores-detalhes">';
    
    // Mostra detalhes por aprendiz
    if (detalhes.aprendizes && detalhes.aprendizes.length > 0) {
        detalhes.aprendizes.forEach((aprendiz, index) => {
            html += `
                <div class="aprendiz-valores">
                    <h4>${aprendiz.nome || `Aprendiz ${index + 1}`}</h4>
                    <ul>
            `;
            
            if (aprendiz.cursos && aprendiz.cursos.length > 0) {
                aprendiz.cursos.forEach(cursoId => {
                    html += `<li>Curso: ${cursoId}</li>`;
                });
            }
            
            html += '</ul></div>';
        });
    }
    
    // Mostra plano selecionado
    if (detalhes.plano_pagamento) {
        html += `<div class="plano-selecionado">Plano: ${detalhes.plano_pagamento}</div>`;
    }
    
    // Mostra desconto se aplicável
    if (detalhes.desconto) {
        html += `<div class="desconto-aplicado">Desconto: ${detalhes.desconto}</div>`;
    }
    
    // Mostra cupom se aplicável
    if (detalhes.cupom && detalhes.cupom_desconto) {
        html += `<div class="cupom-aplicado">Cupom: ${detalhes.cupom} (${detalhes.cupom_desconto}%)</div>`;
    }
    
    // Mostra valor total
    html += `
        <div class="valor-total">
            <strong>Total Estimado: R$ ${valorTotal.toFixed(2)}</strong>
        </div>
    </div>`;
    
    container.innerHTML = html;
}

// Pré-preenchimento via webhook
async function preencherFormularioViaWebhook(token) {
    try {
        const response = await fetch(`https://api.quintaldasartes.com.br/matricula/${token}`);
        const data = await response.json();
        
        // Preenche dados do responsável
        if (data.responsavel) {
            const campos = ['nome', 'cpf', 'email', 'telefone'];
            campos.forEach(campo => {
                const elemento = document.getElementById(`${campo}_responsavel`);
                if (elemento && data.responsavel[campo]) {
                    elemento.value = data.responsavel[campo];
                }
            });
        }

        // Preenche aprendizes
        if (data.aprendizes && data.aprendizes.length > 0) {
            // Remove o aprendiz padrão se existir
            const container = document.getElementById('aprendizes-container');
            if (container) {
                container.innerHTML = '';
            }
            
            data.aprendizes.forEach(aprendiz => {
                adicionarAprendizPreenchido(aprendiz);
            });
        }

        // Preenche plano e desconto
        if (data.plano) {
            const planoInput = document.querySelector(`input[name="plano_pagamento"][value="${data.plano}"]`);
            if (planoInput) {
                planoInput.checked = true;
            }
        }
        
        if (data.desconto) {
            const descontoSelect = document.getElementById('desconto');
            if (descontoSelect) {
                descontoSelect.value = data.desconto;
            }
        }

        atualizarValores();
    } catch (error) {
        console.error('Erro ao pré-preencher formulário:', error);
        // Não mostra alert para não interromper o fluxo se a API não estiver disponível
    }
}

// Adicionar aprendiz pré-preenchido
function adicionarAprendizPreenchido(dadosAprendiz) {
    adicionarAprendiz();
    
    const ultimoAprendiz = document.querySelector('.aprendiz-card:last-child');
    if (ultimoAprendiz && dadosAprendiz) {
        const nomeInput = ultimoAprendiz.querySelector('input[name="nome_aprendiz[]"]');
        const dataInput = ultimoAprendiz.querySelector('input[name="data_nascimento_aprendiz[]"]');
        const cursosSelect = ultimoAprendiz.querySelector('select[name="cursos_aprendiz[]"]');
        
        if (nomeInput && dadosAprendiz.nome) {
            nomeInput.value = dadosAprendiz.nome;
        }
        
        if (dataInput && dadosAprendiz.data_nascimento) {
            dataInput.value = dadosAprendiz.data_nascimento;
        }
        
        if (cursosSelect && dadosAprendiz.cursos) {
            dadosAprendiz.cursos.forEach(cursoId => {
                const option = cursosSelect.querySelector(`option[value="${cursoId}"]`);
                if (option) {
                    option.selected = true;
                }
            });
        }
    }
}

// Manipulação do formulário
async function handleSubmit(e) {
    e.preventDefault();
    
    if (!validarEtapa1() || !validarEtapa2()) {
        return;
    }

    const formData = coletarDadosFormulario();
    
    try {
        const response = await fetch('https://api.quintaldasartes.com.br/inscricao', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        
        if (data.link) {
            mostrarModalSucesso(data.link);
        } else {
            // Caso de bolsista integral
            mostrarModalSucessoBolsista();
        }
    } catch (error) {
        console.error('Erro ao enviar formulário:', error);
        // Simula sucesso para teste local
        mostrarModalSucesso('#');
    }
}

// Funções auxiliares
function mostrarErro(elementId, mensagem) {
    const elemento = document.getElementById(elementId);
    if (elemento) {
        elemento.textContent = mensagem;
        elemento.style.display = 'block';
    }
}

function mostrarModalSucesso(linkPagamento) {
    // Como não temos modal no HTML, vamos para a tela 3
    showScreen('screen-3');
    
    const btnPagamento = document.getElementById('btn-pagamento');
    if (btnPagamento && linkPagamento && linkPagamento !== '#') {
        btnPagamento.onclick = () => {
            window.open(linkPagamento, '_blank');
        };
    }
}

function mostrarModalSucessoBolsista() {
    showScreen('screen-3');
    
    const btnPagamento = document.getElementById('btn-pagamento');
    if (btnPagamento) {
        btnPagamento.style.display = 'none';
    }
    
    // Atualiza texto se necessário
    const successDescription = document.querySelector('.success-description');
    if (successDescription) {
        successDescription.textContent = 'Sua inscrição foi realizada com sucesso! Como bolsista integral, não é necessário realizar pagamento.';
    }
}

// Função para calcular valor total (implementação básica)
function calcularValorTotal(detalhes) {
    // Esta função deve usar o priceCalculator.js
    // Implementação básica para evitar erros
    if (typeof calcularValorTotal !== 'undefined' && window.calcularValorTotal) {
        return window.calcularValorTotal(detalhes);
    }
    
    // Fallback simples
    let total = 0;
    
    if (detalhes.aprendizes) {
        detalhes.aprendizes.forEach(aprendiz => {
            if (aprendiz.cursos) {
                total += aprendiz.cursos.length * 200; // Valor base fictício
            }
        });
    }
    
    return total;
}
