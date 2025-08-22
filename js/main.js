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

// Configuração de event listeners
function setupEventListeners() {
    // Botões de navegação
    document.querySelector('.next-step').addEventListener('click', nextStep);
    document.querySelector('.prev-step').addEventListener('click', prevStep);
    
    // Adicionar/Remover aprendiz
    document.getElementById('add-aprendiz').addEventListener('click', adicionarAprendiz);
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-aprendiz')) {
            removerAprendiz(e.target.closest('.aprendiz-card'));
        }
    });

    // Aplicar cupom
    document.getElementById('aplicar-cupom').addEventListener('click', aplicarCupom);

    // Submit do formulário
    document.getElementById('inscricaoForm').addEventListener('submit', handleSubmit);
}

// Funções de navegação
function nextStep(e) {
    e.preventDefault();
    if (validarEtapa1()) {
        document.getElementById('step1').style.display = 'none';
        document.getElementById('step2').style.display = 'block';
    }
}

function prevStep(e) {
    e.preventDefault();
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step1').style.display = 'block';
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
        if (!elemento.value.trim()) {
            elemento.classList.add('input-error');
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

// Manipulação de aprendizes
function adicionarAprendiz() {
    const template = document.getElementById('aprendiz-template');
    const container = document.getElementById('aprendizes-container');
    const clone = template.content.cloneNode(true);
    
    // Atualiza o número do aprendiz
    const numero = container.children.length + 1;
    clone.querySelector('.aprendiz-numero').textContent = numero;
    
    container.appendChild(clone);
    atualizarValores();
}

function removerAprendiz(card) {
    card.remove();
    // Atualiza numeração dos aprendizes restantes
    document.querySelectorAll('.aprendiz-numero').forEach((span, index) => {
        span.textContent = index + 1;
    });
    atualizarValores();
}

// Pré-preenchimento via webhook
async function preencherFormularioViaWebhook(token) {
    try {
        const response = await fetch(`https://api.quintaldasartes.com.br/matricula/${token}`);
        const data = await response.json();
        
        // Preenche dados do responsável
        document.getElementById('nome_responsavel').value = data.responsavel.nome;
        document.getElementById('cpf_responsavel').value = data.responsavel.cpf;
        document.getElementById('email_responsavel').value = data.responsavel.email;
        document.getElementById('telefone_responsavel').value = data.responsavel.telefone;

        // Preenche aprendizes
        data.aprendizes.forEach(aprendiz => {
            adicionarAprendizPreenchido(aprendiz);
        });

        // Preenche plano e desconto
        if (data.plano) {
            document.querySelector(`input[name="plano_pagamento"][value="${data.plano}"]`).checked = true;
        }
        if (data.desconto) {
            document.getElementById('desconto').value = data.desconto;
        }

        atualizarValores();
    } catch (error) {
        console.error('Erro ao pré-preencher formulário:', error);
        alert('Erro ao carregar dados da matrícula. Por favor, tente novamente.');
    }
}

// Manipulação do formulário
async function handleSubmit(e) {
    e.preventDefault();
    
    if (!validarEtapa2()) return;

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
        alert('Erro ao enviar inscrição. Por favor, tente novamente.');
    }
}

// Funções auxiliares
function mostrarErro(elementId, mensagem) {
    const elemento = document.getElementById(elementId);
    elemento.textContent = mensagem;
    elemento.style.display = 'block';
}

function atualizarValores() {
    const detalhesMatricula = coletarDadosFormulario();
    const valorTotal = calcularValorTotal(detalhesMatricula);
    
    document.getElementById('valor_calculado_total').value = valorTotal;
    document.getElementById('detalhes_matricula').value = JSON.stringify(detalhesMatricula);
    
    atualizarResumoValores(valorTotal, detalhesMatricula);
}

function mostrarModalSucesso(linkPagamento) {
    const modal = document.getElementById('success-modal');
    modal.style.display = 'flex';
    
    document.getElementById('btn-pagamento').onclick = () => {
        window.open(linkPagamento, '_blank');
    };
}

function mostrarModalSucessoBolsista() {
    const modal = document.getElementById('success-modal');
    const btnPagamento = document.getElementById('btn-pagamento');
    
    modal.querySelector('p').textContent = 'Sua inscrição foi realizada com sucesso!';
    btnPagamento.style.display = 'none';
    modal.style.display = 'flex';
}
