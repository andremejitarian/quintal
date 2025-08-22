// js/script.js

$(document).ready(function() {
    let currentStep = 1; // Inicia no primeiro passo (bem-vindo)
    const totalSteps = 4; // Contando os passos de dados (1 a 4)
    let apprenticeCounter = 0; // Para dar IDs únicos aos aprendizes
    let pricesDataLoaded = false;
    let prefilledData = null; // Para armazenar dados pré-preenchidos

    // URLs dos webhooks
    const WEBHOOK_CONSULTA_URL = 'https://criadordigital-n8n-webhook.kttqgl.easypanel.host/webhook/sua_webhook_de_consulta_dados_matricula';
    const WEBHOOK_SUBMISSAO_URL = 'https://criadordigital-n8n-webhook.kttqgl.easypanel.host/webhook/c51bd45c-c232-44db-8490-f52f22ae34ce';

    // Inicializa as máscaras para os campos
    function initializeMasks() {
        $('.mask-cpf').mask('000.000.000-00', { reverse: true });
        $('.mask-phone').mask('(00) 0 0000-0000');
        $('.mask-date').mask('00/00/0000');
    }

    // Carrega dados e inicializa o formulário
    async function initForm() {
        pricesDataLoaded = await priceCalculator.loadPriceData();
        if (pricesDataLoaded) {
            initializeMasks();
            await checkMatriculaParam(); // Verifica e tenta pré-preencher via URL
            showStep(currentStep); // Exibe o primeiro passo
            if (!prefilledData) { // Se não houve pré-preenchimento, adiciona um aprendiz vazio
                addApprentice(false);
            }
            setupEventListeners(); // Configura todos os event listeners
            updateSummaryAndTotal(); // Calcula e exibe o resumo inicial
        } else {
            // Caso os dados não carreguem, desabilita o formulário ou exibe mensagem de erro
            $('#registrationForm').html('<p class="error-message" style="display: block; text-align: center;">Não foi possível carregar os dados do formulário. Por favor, tente novamente mais tarde.</p>');
        }
    }

    // Exibe um passo específico do formulário
    function showStep(stepNum) {
        $('.form-step').removeClass('active');
        // Mapeia os passos para os IDs reais no HTML
        let stepId;
        if (stepNum === 1) stepId = '#step-1';
        else if (stepNum === 2) stepId = '#step-2'; // Dados do Responsável
        else if (stepNum === 3) stepId = '#step-3'; // Dados dos Aprendizes
        else if (stepNum === 4) stepId = '#step-terms'; // Termos e Condições
        else if (stepNum === 5) stepId = '#step-4'; // Plano de Pagamento e Resumo
        else if (stepNum === 'success') stepId = '#step-success';

        $(stepId).addClass('active');
        currentStep = stepNum;

        // Ajusta visibilidade dos botões de navegação
        const isSuccessStep = (stepId === '#step-success');
        const isFinalDataStep = (stepId === '#step-4'); // Passo do resumo financeiro
        const isWelcomeStep = (stepId === '#step-1');

        $('.btn-prev').toggle(!isWelcomeStep && !isSuccessStep);
        $('.btn-next').toggle(!isFinalDataStep && !isSuccessStep);
        $('.btn-submit').toggle(isFinalDataStep);
        $('#goToPaymentBtn').toggle(false); // Esconde por padrão, só mostra se tiver link de pagamento

        // Rola para o topo da página após a mudança de passo
        $('html, body').animate({
            scrollTop: $(".form-container").offset().top
        }, 500);
    }

    // Função para validar campos
    function validateField(inputElement, validationFn = null, errorMessage = 'Campo obrigatório.') {
        const $input = $(inputElement);
        const $formGroup = $input.closest('.form-group, .checkbox-group');
        const $errorDiv = $formGroup.find('.error-message');
        let isValid = true;

        // Limpa erros anteriores
        $input.removeClass('input-error');
        $errorDiv.hide().text('');

        if ($input.is(':checkbox')) {
            if ($input.prop('required') && !$input.is(':checked')) {
                isValid = false;
            }
        } else if ($input.is('select[multiple]')) {
             if ($input.prop('required') && ($input.val() === null || $input.val().length === 0)) {
                isValid = false;
             }
        } else if ($input.prop('required') && $input.val().trim() === '') {
            isValid = false;
        } else if (validationFn && !validationFn($input.val())) {
            isValid = false;
        }

        if (!isValid) {
            $input.addClass('input-error');
            $errorDiv.text(errorMessage).show();
        }
        return isValid;
    }

    // Valida o passo atual antes de avançar
    function validateCurrentStep() {
        let isValid = true;
        let elementsToValidate = [];

        if (currentStep === 1) {
            // Nada a validar no passo de boas-vindas
            isValid = true;
        } else if (currentStep === 2) { // Dados do Responsável (step-2)
            elementsToValidate = [
                $('#nomeResponsavel'),
                $('#emailResponsavel'),
                $('#telefoneResponsavel'),
                $('#cpfResponsavel')
            ];

            // Validação dos campos do responsável
            isValid = validateField($('#nomeResponsavel'), null, 'Nome é obrigatório.') && isValid;
            isValid = validateField($('#emailResponsavel'), (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Email inválido.') && isValid;
            isValid = validateField($('#telefoneResponsavel'), (val) => val.replace(/\D/g, '').length === 11, 'Telefone inválido.') && isValid;
            isValid = validateField($('#cpfResponsavel'), (val) => isValidCPF(val), 'CPF inválido.') && isValid;

            // Validação "Como ficou sabendo"
            const $howKnowCheckboxes = $('input[name="comoSoube"]');
            const $howKnowErrorDiv = $('.how-know-error');
            if ($howKnowCheckboxes.filter(':checked').length === 0) {
                isValid = false;
                $howKnowErrorDiv.text('Selecione pelo menos uma opção.').show();
            } else {
                $howKnowErrorDiv.hide().text('');
            }

        } else if (currentStep === 3) { // Dados dos Aprendizes (step-3)
            const $apprenticeGroups = $('#apprenticesContainer .apprentice-group:not(.template)');
            if ($apprenticeGroups.length === 0) {
                alert('É necessário adicionar pelo menos um aprendiz.');
                return false;
            }

            $apprenticeGroups.each(function() {
                const $group = $(this);
                // Validar campos de cada aprendiz
                isValid = validateField($group.find('.nomeAprendiz'), null, 'Nome do aprendiz é obrigatório.') && isValid;
                isValid = validateField($group.find('.dataNascimentoAprendiz'), (val) => val.replace(/\D/g, '').length === 8, 'Data de nascimento inválida (DD/MM/AAAA).') && isValid;
                isValid = validateField($group.find('.generoAprendiz'), (val) => val !== '', 'Selecione o gênero.') && isValid;
                isValid = validateField($group.find('.restricaoAlimentarAprendiz'), null, 'Campo obrigatório.') && isValid;
                isValid = validateField($group.find('.questaoSaudeAprendiz'), null, 'Campo obrigatório.') && isValid;
                isValid = validateField($group.find('.emergenciaQuemChamarAprendiz'), null, 'Campo obrigatório.') && isValid;

                // Validação de cursos: pelo menos 1 curso deve ser selecionado
                const $cursosSelect = $group.find('.cursosAprendiz');
                if ($cursosSelect.val() === null || $cursosSelect.val().length === 0) {
                    validateField($cursosSelect, () => false, 'Selecione pelo menos um curso.');
                    isValid = false;
                } else {
                    validateField($cursosSelect, () => true); // Limpa o erro se estiver ok
                }
            });
        } else if (currentStep === 4) { // Termos e Condições (step-terms)
            isValid = validateField($('#aceiteTermos'), null, 'Você deve aceitar os termos e condições.') && isValid;

            const $photoConsentRadios = $('input[name="autorizaFoto"]');
            const $photoConsentErrorDiv = $('.photo-consent-error');
            if ($photoConsentRadios.filter(':checked').length === 0) {
                isValid = false;
                $photoConsentErrorDiv.text('Selecione uma opção para autorização de uso de imagem.').show();
            } else {
                $photoConsentErrorDiv.hide().text('');
            }
        } else if (currentStep === 5) { // Plano de Pagamento e Resumo (step-4)
            // Plano de Pagamento
            const $planRadios = $('input[name="planoPagamento"]');
            const $planErrorDiv = $('.plan-error');
            if ($planRadios.filter(':checked').length === 0) {
                isValid = false;
                if ($planErrorDiv.length === 0) {
                    $('input[name="planoPagamento"]').closest('.checkbox-group-container').after('<div class="error-message plan-error">Selecione um plano de pagamento.</div>');
                } else {
                    $planErrorDiv.text('Selecione um plano de pagamento.').show();
                }
            } else {
                $('.plan-error').hide().text('');
            }

            // Forma de Pagamento
            isValid = validateField($('#formaPagamento'), null, 'Selecione a forma de pagamento.') && isValid;
            
            // Dia de Vencimento só é obrigatório se for PIX/Boleto
            if ($('#formaPagamento').val() === 'PIX/Boleto') {
                isValid = validateField($('#diaVencimento'), null, 'Selecione o dia de vencimento.') && isValid;
            }
        }
        return isValid;
    }

    // Adiciona um novo grupo de aprendiz
    function addApprentice(animate = true, apprenticeData = null) {
        apprenticeCounter++;
        const $newApprentice = $('.apprentice-group.template').clone().removeClass('template').removeAttr('style');

        // Atualiza IDs e 'for' dos labels para serem únicos
        $newApprentice.find('label, input, select, textarea').each(function() {
            const $this = $(this);
            const oldId = $this.attr('id');
            if (oldId) {
                const newId = oldId.replace('-TEMPLATE', '-' + apprenticeCounter);
                $this.attr('id', newId);
                // Atualiza 'for' do label (se existir)
                $(`label[for="${oldId}"]`).attr('for', newId);
            }
        });
        
        // Atualiza o número do aprendiz no título
        $newApprentice.find('.apprentice-number').text(apprenticeCounter);

        // Popula o dropdown de cursos
        const $courseSelect = $newApprentice.find('.cursosAprendiz');
        populateCourseDropdown($courseSelect);
        
        // Mostra o botão de remover se houver mais de um aprendiz
        if ($('#apprenticesContainer .apprentice-group:not(.template)').length > 0) {
            $newApprentice.find('.btn-remove-apprentice').show();
        }
        
        $('#apprenticesContainer').append($newApprentice);

        // Preenche dados se houver prefilledData para este aprendiz
        if (apprenticeData) {
            $newApprentice.find('.nomeAprendiz').val(apprenticeData.nome);
            $newApprentice.find('.escolaAprendiz').val(apprenticeData.escola);
            $newApprentice.find('.dataNascimentoAprendiz').val(apprenticeData.dataNascimento);
            $newApprentice.find('.generoAprendiz').val(apprenticeData.genero);
            $newApprentice.find('.restricaoAlimentarAprendiz').val(apprenticeData.restricaoAlimentar);
            $newApprentice.find('.questaoSaudeAprendiz').val(apprenticeData.questaoSaude);
            $newApprentice.find('.emergenciaQuemChamarAprendiz').val(apprenticeData.emergenciaQuemChamar);
            if (apprenticeData.consentimentoFoto) {
                $newApprentice.find('.consentimentoFoto').prop('checked', true);
            }

            // Seleciona os cursos. Os dados do webhook vêm com nomes, precisamos dos IDs
            if (apprenticeData.cursos && Array.isArray(apprenticeData.cursos)) {
                const courseIdsToSelect = [];
                const allCourses = priceCalculator.getAllCourses();
                apprenticeData.cursos.forEach(courseName => {
                    // Encontrar o ID do curso pelo nome
                    const courseObj = allCourses.find(c => c.nome === courseName);
                    if (courseObj) {
                        courseIdsToSelect.push(courseObj.id);
                    }
                });
                $courseSelect.val(courseIdsToSelect);
            }
        }

        initializeMasks(); // Aplica máscaras aos novos campos

        if (animate) {
            $newApprentice.hide().fadeIn(300);
        }
        
        // Atualiza a visibilidade dos botões de remover
        updateRemoveButtons();
        updateSummaryAndTotal(); // Recalcula após adicionar
    }

    // Remove um grupo de aprendiz
    function removeApprentice(button) {
        if ($('#apprenticesContainer .apprentice-group:not(.template)').length > 1) {
            $(button).closest('.apprentice-group').fadeOut(300, function() {
                $(this).remove();
                // Reordena os números dos aprendizes visíveis
                $('#apprenticesContainer .apprentice-group:not(.template)').each(function(index) {
                    $(this).find('.apprentice-number').text(index + 1);
                });
                updateRemoveButtons();
                updateSummaryAndTotal(); // Recalcula após remover
            });
        } else {
            alert('Você deve ter pelo menos um aprendiz.');
        }
    }

    // Atualiza a visibilidade dos botões de remover
    function updateRemoveButtons() {
        const $apprenticeGroups = $('#apprenticesContainer .apprentice-group:not(.template)');
        if ($apprenticeGroups.length <= 1) {
            $apprenticeGroups.find('.btn-remove-apprentice').hide();
        } else {
            $apprenticeGroups.find('.btn-remove-apprentice').show();
        }
    }

    // Popula o dropdown de cursos
    function populateCourseDropdown($selectElement) {
        $selectElement.empty();
        $selectElement.append('<option value="">Selecione curso(s)</option>');

        const allCourses = priceCalculator.getAllCourses();
        
        // Separa cursos e contraturnos
        const cursos = allCourses.filter(c => c.categoria === 'curso');
        const contraturnos = allCourses.filter(c => c.categoria === 'contraturno');

        // Função para criar as opções agrupadas
        function appendOptions(groupName, courseList) {
            if (courseList.length > 0) {
                const $optgroup = $('<optgroup>').attr('label', groupName);
                courseList.forEach(course => {
                    // Mostra o preço mensal como referência
                    const referencePrice = course.precos.mensal;
                    $optgroup.append(
                        $('<option>')
                            .val(course.id)
                            .text(`${course.nome} (a partir de R$ ${referencePrice.toFixed(2).replace('.', ',')})`)
                    );
                });
                $selectElement.append($optgroup);
            }
        }

        appendOptions('Cursos Livres', cursos);
        appendOptions('Contraturnos', contraturnos);
    }

    // Coleta todos os dados do formulário
    function collectFormData() {
        const formData = {
            matricula: $('#matricula').val(),
            responsavel: {
                nome: $('#nomeResponsavel').val(),
                cpf: $('#cpfResponsavel').val().replace(/\D/g, ''),
                email: $('#emailResponsavel').val(),
                telefone: $('#telefoneResponsavel').val().replace(/\D/g, ''),
                endereco: $('#enderecoResponsavel').val(),
                segundoResponsavelNome: $('#segundoResponsavelNome').val(),
                segundoResponsavelTelefone: $('#segundoResponsavelTelefone').val().replace(/\D/g, '')
            },
            comoSoube: [],
            aprendizes: [],
            planoPagamento: $('input[name="planoPagamento"]:checked').val(),
            formaPagamento: $('#formaPagamento').val(),
            diaVencimento: ($('#formaPagamento').val() === 'PIX/Boleto') ? $('#diaVencimento').val() : '',
            aceiteTermos: $('#aceiteTermos').is(':checked'),
            autorizaFoto: $('input[name="autorizaFoto"]:checked').val(),
            cupomCode: $('#cupomCode').val().toUpperCase()
        };

        // Coleta "Como soube"
        $('input[name="comoSoube"]:checked').each(function() {
            formData.comoSoube.push($(this).val());
        });

        $('#apprenticesContainer .apprentice-group:not(.template)').each(function() {
            const $group = $(this);
            const aprendiz = {
                nome: $group.find('.nomeAprendiz').val(),
                escola: $group.find('.escolaAprendiz').val(),
                dataNascimento: $group.find('.dataNascimentoAprendiz').val(),
                genero: $group.find('.generoAprendiz').val(),
                cursos: $group.find('.cursosAprendiz').val(), // Retorna array de IDs
                consentimentoFoto: $group.find('.consentimentoFoto').is(':checked'),
                restricaoAlimentar: $group.find('.restricaoAlimentarAprendiz').val(),
                questaoSaude: $group.find('.questaoSaudeAprendiz').val(),
                emergenciaQuemChamar: $group.find('.emergenciaQuemChamarAprendiz').val()
            };
            formData.aprendizes.push(aprendiz);
        });

        // Adiciona os detalhes de preço calculados
        const priceDetails = updateSummaryAndTotal();
        formData.resumoFinanceiro = priceDetails;
        formData.valor_calculado_total = priceDetails.total;
        
        // Serializa os detalhes da matrícula para o campo oculto
        // Converte os IDs dos cursos para os nomes dos cursos para o backend
        const detalhesAprendizesParaBackend = formData.aprendizes.map(ap => {
            const cursosNomes = (ap.cursos || []).map(id => {
                return priceCalculator.getCourseNameById(id);
            });
            return { ...ap, cursos: cursosNomes };
        });

        formData.detalhes_matricula = JSON.stringify({
            responsavel: formData.responsavel.nome,
            aprendizes: detalhesAprendizesParaBackend,
            planoPagamento: formData.planoPagamento,
            cupomAplicado: formData.cupomCode,
            valorFinal: formData.valor_calculado_total,
            valorOriginal: priceDetails.originalTotal || priceDetails.subtotal,
            isBolsista: priceDetails.isScholarship || formData.formaPagamento === 'Bolsista Integral'
        });

        return formData;
    }

    // Atualiza a seção de resumo e o total
    function updateSummaryAndTotal() {
        if (!pricesDataLoaded) return { total: 0 };

        const allSelectedCourseIds = [];
        const apprenticesSummary = [];
        let apprenticesCount = 0;

        $('#apprenticesContainer .apprentice-group:not(.template)').each(function() {
            const $group = $(this);
            const apprenticeName = $group.find('.nomeAprendiz').val() || `Aprendiz ${$group.find('.apprentice-number').text()}`;
            const selectedCourseIds = $group.find('.cursosAprendiz').val() || [];
            
            apprenticesCount++;
            
            const coursesDetails = [];
            selectedCourseIds.forEach(courseId => {
                allSelectedCourseIds.push(courseId);
                const courseName = priceCalculator.getCourseNameById(courseId);
                coursesDetails.push(courseName);
            });
            
            apprenticesSummary.push({ 
                name: apprenticeName, 
                courses: coursesDetails 
            });
        });

        const paymentPlan = $('input[name="planoPagamento"]:checked').val() || 'mensal';
        const couponCode = $('#cupomCode').val();
        const paymentMethod = $('#formaPagamento').val();

        const totals = priceCalculator.calculateTotal(
            allSelectedCourseIds, 
            paymentPlan, 
            couponCode, 
            paymentMethod,
            apprenticesCount
        );

        // Atualiza a lista de aprendizes no resumo
        const $summaryList = $('#summaryApprenticesList');
        $summaryList.empty();
        if (apprenticesSummary.length > 0) {
            apprenticesSummary.forEach(app => {
                if (app.courses.length > 0) {
                    $summaryList.append(`<li><strong>${app.name}:</strong> ${app.courses.join(', ')}</li>`);
                } else {
                    $summaryList.append(`<li><strong>${app.name}:</strong> Nenhum curso selecionado</li>`);
                }
            });
        } else {
            $summaryList.append(`<li>Nenhum aprendiz adicionado</li>`);
        }

        // Verifica se é bolsista
        const isScholarship = totals.isScholarship || paymentMethod === 'Bolsista Integral';

        // Atualiza os valores financeiros
        $('#summarySubtotal').text('R$ ' + totals.subtotal.toFixed(2).replace('.', ','));
        $('#summaryDiscount').text('R$ ' + totals.discountAmount.toFixed(2).replace('.', ','));
        $('#summaryCoupon').text('R$ ' + totals.couponAmount.toFixed(2).replace('.', ','));
        $('#summaryCardFee').text('R$ ' + totals.cardFee.toFixed(2).replace('.', ','));
        
        // Mostra mensagem especial para bolsista
        if (isScholarship) {
            $('#summaryTotal').html('<span style="color: #28a745; font-weight: bold;">R$ 0,00 (BOLSISTA INTEGRAL)</span>');
            
            // Adiciona mensagem explicativa
            if ($('.scholarship-message').length === 0) {
                $('.price-details').after(`
                    <div class="scholarship-message" style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 15px; margin-top: 15px; color: #155724;">
                        <h4 style="margin: 0 0 10px 0; color: #155724;">🎓 Parabéns! Você recebeu uma bolsa integral!</h4>
                        <p style="margin: 0; font-size: 14px;">
                            Valor original dos cursos: <strong>R$ ${totals.originalTotal.toFixed(2).replace('.', ',')}</strong><br>
                            Desconto aplicado: <strong>100%</strong><br>
                            <strong>Não haverá cobrança para esta inscrição.</strong>
                        </p>
                    </div>
                `);
            } else {
                $('.scholarship-message p').html(`
                    Valor original dos cursos: <strong>R$ ${totals.originalTotal.toFixed(2).replace('.', ',')}</strong><br>
                    Desconto aplicado: <strong>100%</strong><br>
                    <strong>Não haverá cobrança para esta inscrição.</strong>
                `);
            }
        } else {
            $('#summaryTotal').text('R$ ' + totals.total.toFixed(2).replace('.', ','));
            $('.scholarship-message').remove();
        }

        // Atualiza o texto do botão de submit baseado no tipo
        const $submitBtn = $('.btn-submit');
        if (isScholarship) {
            $submitBtn.html('Finalizar Inscrição Bolsista <span>🎓</span>');
        } else {
            $submitBtn.html('Finalizar Inscrição <span>✓</span>');
        }

        // Atualiza os campos ocultos
        $('#valor_calculado_total').val(totals.total.toFixed(2));
        
        return totals;
    }

    // Verifica o parâmetro 'matricula' na URL e tenta pré-preencher
    async function checkMatriculaParam() {
        const urlParams = new URLSearchParams(window.location.search);
        const matricula = urlParams.get('matricula');
        if (matricula) {
            $('#matricula').val(matricula);
            console.log('Matrícula pré-preenchida via URL:', matricula);

            try {
                // Remove qualquer aprendiz padrão adicionado antes do pré-preenchimento
                $('#apprenticesContainer .apprentice-group:not(.template)').remove();
                apprenticeCounter = 0; // Reseta o contador para os aprendizes pré-preenchidos

                const response = await fetch(`${WEBHOOK_CONSULTA_URL}?matricula=${matricula}`);
                if (!response.ok) {
                    throw new Error(`Erro ao consultar dados de matrícula: ${response.statusText}`);
                }
                const data = await response.json();

                if (data.success && data.data) {
                    prefilledData = data.data;
                    console.log('Dados pré-preenchidos recebidos:', prefilledData);
                    fillFormWithPrefilledData(prefilledData);
                } else {
                    console.warn('Resposta do webhook de consulta de matrícula não indica sucesso ou não contém dados.');
                    // Adiciona um aprendiz vazio se a consulta falhar
                    addApprentice(false);
                }
            } catch (error) {
                console.error('Erro ao pré-preencher formulário via webhook:', error);
                alert('Não foi possível carregar dados de rematrícula. Por favor, preencha manualmente.');
                // Adiciona um aprendiz vazio se a consulta falhar
                addApprentice(false);
            }
        }
    }

    // Preenche o formulário com os dados recebidos do webhook
    function fillFormWithPrefilledData(data) {
        // Dados do Responsável
        if (data.responsavel) {
            $('#nomeResponsavel').val(data.responsavel.nome);
            $('#cpfResponsavel').val(data.responsavel.cpf).trigger('input'); // Trigger para aplicar máscara
            $('#emailResponsavel').val(data.responsavel.email);
            $('#telefoneResponsavel').val(data.responsavel.telefone).trigger('input'); // Trigger para aplicar máscara
            $('#enderecoResponsavel').val(data.responsavel.endereco || '');
            $('#segundoResponsavelNome').val(data.responsavel.segundoResponsavelNome || '');
            $('#segundoResponsavelTelefone').val(data.responsavel.segundoResponsavelTelefone || '').trigger('input');
        }

        // Como ficou sabendo
        if (data.comoSoube && Array.isArray(data.comoSoube)) {
            $('input[name="comoSoube"]').prop('checked', false); // Desmarcar todos primeiro
            data.comoSoube.forEach(source => {
                $(`input[name="comoSoube"][value="${source}"]`).prop('checked', true);
            });
        }

        // Aprendizes
        if (data.aprendizes && Array.isArray(data.aprendizes)) {
            $('#apprenticesContainer').empty(); // Limpa aprendizes existentes (se houver)
            apprenticeCounter = 0; // Reseta o contador
            data.aprendizes.forEach(apprentice => {
                addApprentice(true, apprentice); // Adiciona e preenche cada aprendiz
            });
        }

        // Plano de Pagamento
        if (data.planoPagamento) {
            $(`input[name="planoPagamento"][value="${data.planoPagamento}"]`).prop('checked', true);
        }

        // Forma de Pagamento e Dia de Vencimento
        if (data.formaPagamento) {
            $('#formaPagamento').val(data.formaPagamento).trigger('change');
            if (data.formaPagamento === 'PIX/Boleto' && data.diaVencimento) {
                $('#diaVencimento').val(data.diaVencimento);
            }
        }
        
        // Cupom Code
        if (data.couponCode) {
            $('#cupomCode').val(data.couponCode).trigger('input');
        }

        updateSummaryAndTotal(); // Atualiza o resumo com os dados pré-preenchidos
    }
    
    // Configura todos os event listeners
    function setupEventListeners() {
        // Navegação entre passos
        $('.btn-next').on('click', function() {
            if (validateCurrentStep()) {
                if (currentStep < totalSteps + 1) { // totalSteps + 1 para incluir o passo de termos
                    showStep(currentStep + 1);
                }
            } else {
                alert('Por favor, preencha todos os campos obrigatórios corretamente antes de prosseguir.');
            }
        });

        $('.btn-prev').on('click', function() {
            if (currentStep > 1) {
                showStep(currentStep - 1);
            }
        });

        // Adicionar/Remover Aprendiz
        $('.btn-add-apprentice').on('click', function() {
            addApprentice();
        });

        $('#apprenticesContainer').on('click', '.btn-remove-apprentice', function() {
            removeApprentice(this);
        });

        // Disparar cálculo ao mudar seleção de curso, plano ou cupom
        $('#registrationForm').on('change', '.cursosAprendiz, input[name="planoPagamento"]', function() {
            updateSummaryAndTotal();
        });

        // Toggle para Dia de Vencimento
        $('#formaPagamento').on('change', function() {
            if ($(this).val() === 'PIX/Boleto') {
                $('#diaVencimentoGroup').slideDown();
                $('#diaVencimento').prop('required', true);
            } else {
                $('#diaVencimentoGroup').slideUp();
                $('#diaVencimento').prop('required', false);
                $('#diaVencimento').val(''); // Limpa a seleção
                validateField($('#diaVencimento')); // Limpa o erro visual
            }
            // Disparar cálculo se a forma de pagamento afeta taxa
            updateSummaryAndTotal();
        });

        $('#cupomCode').on('input', function() {
            const cupomFeedback = $('.cupom-feedback');
            const couponValue = $(this).val().toUpperCase();
            if (couponValue === '') {
                cupomFeedback.text('').removeClass('error success scholarship');
            } else if (priceCalculator.getCouponsData()[couponValue]) {
                const coupon = priceCalculator.getCouponsData()[couponValue];
                if (priceCalculator.isScholarshipCoupon(couponValue)) {
                    cupomFeedback.text('🎓 Cupom de Bolsista Integral válido!').addClass('scholarship').removeClass('error success');
                } else {
                    cupomFeedback.text('Cupom válido!').addClass('success').removeClass('error scholarship');
                }
            } else {
                cupomFeedback.text('Cupom inválido.').addClass('error').removeClass('success scholarship');
            }
            updateSummaryAndTotal();
        });
        
        // Live validation para CPF e Email em blur
        $('#cpfResponsavel').on('blur', function() {
            validateField(this, (val) => isValidCPF(val), 'CPF inválido.');
        });

        $('#emailResponsavel').on('blur', function() {
            validateField(this, (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Email inválido.');
        });
        
        // Validação genérica para campos required em blur
        $('#registrationForm').on('blur', 'input[required], select[required], textarea[required]', function() {
            validateField(this);
        });

        // Validação "Como ficou sabendo" em change
        $('input[name="comoSoube"]').on('change', function() {
            const $howKnowCheckboxes = $('input[name="comoSoube"]');
            const $howKnowErrorDiv = $('.how-know-error');
            if ($howKnowCheckboxes.filter(':checked').length === 0) {
                $howKnowErrorDiv.text('Selecione pelo menos uma opção.').show();
            } else {
                $howKnowErrorDiv.hide().text('');
            }
        });

        // Validação de radio buttons de autorização de foto
        $('input[name="autorizaFoto"]').on('change', function() {
            const $photoConsentRadios = $('input[name="autorizaFoto"]');
            const $photoConsentErrorDiv = $('.photo-consent-error');
            if ($photoConsentRadios.filter(':checked').length === 0) {
                $photoConsentErrorDiv.text('Selecione uma opção para autorização de uso de imagem.').show();
            } else {
                $photoConsentErrorDiv.hide().text('');
            }
        });

        // Validação de planos de pagamento
        $('input[name="planoPagamento"]').on('change', function() {
            $('.plan-error').hide().text('');
        });

        // Botão de redirecionamento para pagamento
        $('#goToPaymentBtn').on('click', function() {
            const paymentLink = $(this).data('payment-link');
            if (paymentLink) {
                window.open(paymentLink, '_blank');
            }
        });

        // Submissão do formulário
        $('#registrationForm').on('submit', async function(event) {
            event.preventDefault();

            if (validateCurrentStep()) {
                const formData = collectFormData();
                console.log('Dados do Formulário para Submissão:', formData);

                // Verifica se é bolsista
                const isScholarship = priceCalculator.isScholarshipCoupon(formData.cupomCode) || 
                                     formData.formaPagamento === 'Bolsista Integral';

                // Mostra a tela de sucesso imediatamente
                showStep('success');
                $('#paymentRedirectMessage').text('Processando sua inscrição...').show();

                try {
                    const response = await fetch(WEBHOOK_SUBMISSAO_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });

                    if (!response.ok) {
                        throw new Error(`Erro ao enviar inscrição: ${response.statusText}`);
                    }

                    const result = await response.json();
                    console.log('Inscrição enviada com sucesso:', result);

                    if (isScholarship) {
                        // Para bolsista integral, não há link de pagamento
                        $('#paymentRedirectMessage').html(`
                            <h4 style="color: #155724; margin-bottom: 15px;">🎓 Inscrição de Bolsista Finalizada!</h4>
                            <p style="margin-bottom: 10px;">Sua inscrição como <strong>bolsista integral</strong> foi registrada com sucesso.</p>
                            <p style="margin-bottom: 10px;">Valor original dos cursos: <strong>R$ ${formData.resumoFinanceiro.originalTotal.toFixed(2).replace('.', ',')}</strong></p>
                            <p style="margin-bottom: 15px;"><strong>Desconto aplicado: 100% - Não haverá cobrança.</strong></p>
                            <p style="font-size: 14px; color: #6c757d;">Em breve entraremos em contato para os próximos passos.</p>
                        `);
                        $('#goToPaymentBtn').hide();
                    } else if (result.link) {
                        $('#paymentRedirectMessage').text('Sua inscrição foi finalizada com sucesso! Clique abaixo para prosseguir com o pagamento.');
                        $('#goToPaymentBtn').data('payment-link', result.link).show();
                    } else {
                        $('#paymentRedirectMessage').text('Inscrição finalizada com sucesso! Não foi possível obter o link de pagamento. Por favor, entre em contato.');
                        $('#goToPaymentBtn').hide();
                    }

                } catch (error) {
                    console.error('Erro ao enviar inscrição:', error);
                    $('#paymentRedirectMessage').text('Ocorreu um erro ao finalizar a inscrição. Por favor, tente novamente ou entre em contato.');
                    $('#goToPaymentBtn').hide();
                }
            } else {
                alert('Por favor, preencha todos os campos obrigatórios corretamente antes de prosseguir.');
            }
        });
    }

    // Inicia o formulário quando o DOM estiver pronto
    initForm();
});
