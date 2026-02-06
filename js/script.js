// js/script.js

let isSubmitting = false;

$(document).ready(function () {
    let currentStep = 1; // Inicia no primeiro passo (bem-vindo)
    const totalSteps = 4; // Contando os passos de dados (1 a 4)
    let apprenticeCounter = 0; // Para dar IDs únicos aos aprendizes
    let pricesDataLoaded = false;
    let prefilledData = null; // Para armazenar dados pré-preenchidos

    // URLs dos webhooks
    const WEBHOOK_CONSULTA_URL = 'https://criadordigital-n8n-webhook.kttqgl.easypanel.host/webhook/consulta-matricula';
    const WEBHOOK_SUBMISSAO_URL = 'https://auto-n8n-webhook.rbnawr.easypanel.host/webhook/envio-matricula';

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

        // Rola para o topo absoluto da página
        $('html, body').animate({
            scrollTop: 0
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

    // Valida seleção de cursos para um aprendiz
    function validateApprenticesCourses($apprenticeGroup) {
        const $checkedCourses = $apprenticeGroup.find('.course-checkbox:checked');
        const $errorDiv = $apprenticeGroup.find('.courses-selection').siblings('.error-message');

        if ($checkedCourses.length === 0) {
            $errorDiv.text('Selecione pelo menos um curso.').show();
            return false;
        } else {
            $errorDiv.hide().text('');
            return true;
        }
    }

    // Obtém cursos selecionados para um aprendiz
    function getSelectedCourses($apprenticeGroup) {
        const selectedCourses = [];
        $apprenticeGroup.find('.course-checkbox:checked').each(function () {
            selectedCourses.push($(this).val());
        });
        return selectedCourses;
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
                $('#cpfResponsavel'),
                $('#emergenciaQuemChamar')
            ];

            // Validação dos campos do responsável
            isValid = validateField($('#nomeResponsavel'), null, 'Nome é obrigatório.') && isValid;
            isValid = validateField($('#emailResponsavel'), (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Email inválido.') && isValid;
            isValid = validateField($('#telefoneResponsavel'), (val) => val.replace(/\D/g, '').length === 11, 'Telefone inválido.') && isValid;
            isValid = validateField($('#cpfResponsavel'), (val) => isValidCPF(val), 'CPF inválido.') && isValid;
            isValid = validateField($('#emergenciaQuemChamar'), null, 'Campo obrigatório.') && isValid;

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

            $apprenticeGroups.each(function () {
                const $group = $(this);
                // Validar campos de cada aprendiz
                isValid = validateField($group.find('.nomeAprendiz'), null, 'Nome do aprendiz é obrigatório.') && isValid;
                isValid = validateField($group.find('.dataNascimentoAprendiz'), (val) => val.replace(/\D/g, '').length === 8, 'Data de nascimento inválida (DD/MM/AAAA).') && isValid;
                isValid = validateField($group.find('.generoAprendiz'), (val) => val !== '', 'Selecione o gênero.') && isValid;
                isValid = validateField($group.find('.restricaoAlimentarAprendiz'), null, 'Campo obrigatório.') && isValid;
                isValid = validateField($group.find('.questaoSaudeAprendiz'), null, 'Campo obrigatório.') && isValid;

                // Validação de cursos usando a nova função
                isValid = validateApprenticesCourses($group) && isValid;
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
            isValid = validateField($('#planoPagamento'), null, 'Selecione um plano de pagamento.') && isValid;

            // Forma de Pagamento
            isValid = validateField($('#formaPagamento'), null, 'Selecione a forma de pagamento.') && isValid;

            // Dia de Vencimento só é obrigatório se for PIX/Boleto
            if ($('#formaPagamento').val() === 'PIX/Boleto') {
                isValid = validateField($('#diaVencimento'), null, 'Selecione o dia de vencimento.') && isValid;
            }
        }
        return isValid;
    }

    // Popula a seleção de cursos com checkboxes
    function populateCourseSelection($container) {
        const allCourses = priceCalculator.getAllCourses();
        const apprenticeNumber = $container.closest('.apprentice-group').find('.apprentice-number').text();

        // Limpa containers existentes
        $container.find('.courses-checkboxes').empty();

        // Separa cursos e contraturnos
        const cursos = allCourses.filter(c => c.categoria === 'curso');
        const contraturnos = allCourses.filter(c => c.categoria === 'contraturno');

        // Função para criar checkboxes
        function createCheckboxes(courseList, categoryContainer) {
            courseList.forEach(course => {
                const uniqueId = `course-${course.id}-${apprenticeNumber}`;

                // Gerar lista de todos os planos e preços disponíveis para o curso
                const pricesHtml = Object.entries(course.precos)
                    .map(([planKey, price]) => {
                        const planInfo = priceCalculator.getPaymentPlanInfo(planKey);
                        const planName = planInfo ? planInfo.nome : planKey;
                        return `<span class="plan-price-tag"><strong>${planName}:</strong> ${priceCalculator.formatCurrency(price)}</span>`;
                    }).join(' <span class="price-separator">|</span> ');

                const checkboxHtml = `
                    <div class="checkbox-group">
                        <input type="checkbox" 
                               class="course-checkbox" 
                               value="${course.id}" 
                               id="${uniqueId}">
                        <label for="${uniqueId}">
                            <strong>${course.nome}</strong>
                            <div class="course-plans-prices">${pricesHtml}</div>
                        </label>
                    </div>
                `;
                categoryContainer.append(checkboxHtml);
            });
        }

        // Cria checkboxes para cada categoria
        createCheckboxes(cursos, $container.find('[data-category="curso"]'));
        createCheckboxes(contraturnos, $container.find('[data-category="contraturno"]'));
    }

    // Adiciona um novo grupo de aprendiz
    function addApprentice(animate = true, apprenticeData = null) {
        apprenticeCounter++;
        const $newApprentice = $('.apprentice-group.template').clone().removeClass('template').removeAttr('style');

        // Atualiza IDs e 'for' dos labels para serem únicos
        $newApprentice.find('label, input, select, textarea').each(function () {
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

        // Popula a seleção de cursos com checkboxes
        const $courseContainer = $newApprentice.find('.courses-selection');
        populateCourseSelection($courseContainer);

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

            // Seleciona os cursos. Os dados do webhook vêm com nomes, precisamos dos IDs
            if (apprenticeData.cursos && Array.isArray(apprenticeData.cursos)) {
                const allCourses = priceCalculator.getAllCourses();
                apprenticeData.cursos.forEach(courseName => {
                    const courseObj = allCourses.find(c => c.nome === courseName);
                    if (courseObj) {
                        $newApprentice.find(`input[value="${courseObj.id}"]`).prop('checked', true);
                    }
                });
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
            $(button).closest('.apprentice-group').fadeOut(300, function () {
                $(this).remove();
                // Reordena os números dos aprendizes visíveis
                $('#apprenticesContainer .apprentice-group:not(.template)').each(function (index) {
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
            emergenciaQuemChamar: $('#emergenciaQuemChamar').val(),
            comoSoube: [],
            aprendizes: [],
            planoPagamento: $('#planoPagamento').val(),
            formaPagamento: $('#formaPagamento').val(),
            diaVencimento: ($('#formaPagamento').val() === 'PIX/Boleto') ? $('#diaVencimento').val() : '',
            aceiteTermos: $('#aceiteTermos').is(':checked'),
            autorizaFoto: $('input[name="autorizaFoto"]:checked').val(),
            cupomCode: $('#cupomCode').val().toUpperCase()
        };

        // Coleta "Como soube"
        $('input[name="comoSoube"]:checked').each(function () {
            formData.comoSoube.push($(this).val());
        });

        $('#apprenticesContainer .apprentice-group:not(.template)').each(function () {
            const $group = $(this);
            const aprendiz = {
                nome: $group.find('.nomeAprendiz').val(),
                escola: $group.find('.escolaAprendiz').val(),
                dataNascimento: $group.find('.dataNascimentoAprendiz').val(),
                genero: $group.find('.generoAprendiz').val(),
                cursos: getSelectedCourses($group), // Usa a nova função
                restricaoAlimentar: $group.find('.restricaoAlimentarAprendiz').val(),
                questaoSaude: $group.find('.questaoSaudeAprendiz').val()
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
            valorFinal: formData.valor_calculado_total
        });

        return formData;
    }

    // Atualiza a seção de resumo e o total
    function updateSummaryAndTotal() {
        if (!pricesDataLoaded) return { total: 0 };

        const allSelectedCourseIds = [];
        const apprenticesSummary = [];
        let apprenticesCount = 0;

        // OBTENHA O PLANO DE PAGAMENTO AQUI, ANTES DE ITERAR PELOS APRENDIZES
        const paymentPlan = $('#planoPagamento').val() || 'avulso'; // 'avulso' como padrão
        
        // Atualiza a política de cancelamento com base no plano selecionado
        updateCancellationPolicy(paymentPlan);

        $('#apprenticesContainer .apprentice-group:not(.template)').each(function () {
            const $group = $(this);
            const apprenticeName = $group.find('.nomeAprendiz').val() || `Aprendiz ${$group.find('.apprentice-number').text()}`;
            const selectedCourseIds = getSelectedCourses($group);

            apprenticesCount++;

            const coursesDetails = [];
            selectedCourseIds.forEach(courseId => {
                allSelectedCourseIds.push(courseId);
                const courseName = priceCalculator.getCourseNameById(courseId);
                // Pegar o preço do curso para o plano de pagamento selecionado
                const coursePrice = priceCalculator.getCoursePrice(courseId, paymentPlan);

                if (coursePrice === 0) {
                    coursesDetails.push(`
                        <span class="course-summary-error">
                            <strong>${courseName}:</strong> 
                            <span class="warning-text">Incompatível com o plano ${priceCalculator.getPaymentPlanInfo(paymentPlan)?.nome || paymentPlan}</span>
                            <div class="incompatibility-msg">Este curso não pode ser adquirido com o plano de pagamento selecionado, neste caso será necessário inscrever os cursos separadamente.</div>
                        </span>
                    `);
                } else {
                    coursesDetails.push(`<strong>${courseName}:</strong> ${priceCalculator.formatCurrency(coursePrice)}`);
                }
            });

            apprenticesSummary.push({
                name: apprenticeName,
                courses: coursesDetails
            });
        });

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
                    $summaryList.append(`<li><strong>${app.name}:</strong><br>${app.courses.join('<br>')}</li>`);
                } else {
                    $summaryList.append(`<li><strong>${app.name}:</strong> Nenhum curso selecionado</li>`);
                }
            });
        } else {
            $summaryList.append(`<li>Nenhum aprendiz adicionado</li>`);
        }

        // Atualiza os valores financeiros usando formatCurrency
        $('#summarySubtotal').text(priceCalculator.formatCurrency(totals.subtotal));
        $('#summaryDiscount').text(priceCalculator.formatCurrency(totals.discountAmount));
        $('#summaryCoupon').text(priceCalculator.formatCurrency(totals.couponAmount));
        $('#summaryCardFee').text(priceCalculator.formatCurrency(totals.cardFee));
        $('#summaryTotal').text(priceCalculator.formatCurrency(totals.total));

        // Atualiza os campos ocultos
        $('#valor_calculado_total').val(totals.total.toFixed(2));

        return totals;
    }

    // Atualiza o texto da política de cancelamento
    function updateCancellationPolicy(planKey) {
        const $policyContainer = $('#cancellation-policy');
        let policyText = '';

        if (planKey === 'mensal') {
            policyText = `
                <strong>Mensal</strong><br>
                Cancelamento a qualquer momento, com aviso prévio de 30 dias.
            `;
        } else if (planKey === 'semestral') {
            policyText = `
                <strong>Semestral</strong><br>
                <ul style="padding-left: 20px; margin: 5px 0 0 0;">
                    <li>Compromisso mínimo de 6 meses.</li>
                    <li>Em caso de cancelamento antecipado, será cobrada multa equivalente a até 2 mensalidades, limitada ao valor das parcelas restantes.</li>
                </ul>
            `;
        } else if (planKey === 'anual') {
            policyText = `
                <strong>Anual</strong><br>
                <ul style="padding-left: 20px; margin: 5px 0 0 0;">
                    <li>Compromisso mínimo de 12 meses.</li>
                    <li>Em caso de cancelamento antecipado, será cobrada multa equivalente a até 3 mensalidades, limitada ao valor das parcelas restantes.</li>
                </ul>
            `;
        }

        if (policyText) {
            $policyContainer.html(policyText).show();
        } else {
            $policyContainer.hide().empty();
        }
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

        // Campo de emergência (agora no responsável)
        if (data.emergenciaQuemChamar) {
            $('#emergenciaQuemChamar').val(data.emergenciaQuemChamar);
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
            updatePaymentPlanOptions();
            $('#planoPagamento').val(data.planoPagamento);
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

        // Autorização de foto (agora está nos termos)
        if (data.autorizaFoto) {
            $(`input[name="autorizaFoto"][value="${data.autorizaFoto}"]`).prop('checked', true);
        }

        updateSummaryAndTotal(); // Atualiza o resumo com os dados pré-preenchidos
    }

    // Função para processar a submissão do formulário
    async function processFormSubmission() {
        console.log('Iniciando processamento da submissão...');

        // ✅ PROTEÇÃO CONTRA MÚLTIPLOS ENVIOS
        if (isSubmitting) {
            console.log('⚠️ Envio já em andamento, ignorando clique duplicado');
            return;
        }

        // Valida o último passo antes de submeter
        if (!validateCurrentStep()) {
            alert('Por favor, preencha todos os campos obrigatórios corretamente antes de prosseguir.');
            return;
        }

        // ✅ MARCA COMO "ENVIANDO"
        isSubmitting = true;

        // ✅ DESABILITA O BOTÃO IMEDIATAMENTE
        const $submitBtn = $('.btn-submit');
        const originalBtnText = $submitBtn.text();
        $submitBtn.prop('disabled', true).text('Enviando...');

        const formData = collectFormData();
        console.log('Dados do Formulário para Submissão:', formData);

        // Referências aos elementos da tela de status
        const $statusBox = $('#registrationStatusBox');
        const $statusHeading = $('#statusHeading');
        const $statusMessage = $('#statusMessage');
        const $goToPaymentBtn = $('#goToPaymentBtn');

        // 1. Mostrar a tela de sucesso e definir estado de "processando"
        showStep('success');

        $statusBox.removeClass('status-success status-error').addClass('status-processing');
        $statusHeading.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Aguarde...');
        $statusMessage.text('Estamos processando sua inscrição...');
        $goToPaymentBtn.hide();

        // Enviar dados para o backend via AJAX
        try {
            console.log('Enviando dados para:', WEBHOOK_SUBMISSAO_URL);

            // ✅ ADICIONA TIMEOUT DE 60 SEGUNDOS
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos

            const response = await fetch(WEBHOOK_SUBMISSAO_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData),
                signal: controller.signal // ✅ Adiciona controle de timeout
            });

            clearTimeout(timeoutId); // ✅ Limpa o timeout se a resposta chegar

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            if (!response.ok) {
                throw new Error(`Erro ao enviar inscrição: ${response.status} - ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Inscrição enviada com sucesso (resposta do webhook):', result);

            // 2. Processamento bem-sucedido do webhook
            $statusBox.removeClass('status-processing').addClass('status-success');
            $statusHeading.html('✅ Sucesso!');

            if (formData.formaPagamento === 'Bolsista Integral') {
                $statusMessage.text('Sua inscrição como bolsista foi registrada com sucesso. Em breve entraremos em contato para os próximos passos.');
                $goToPaymentBtn.hide();
            } else if (result.link) {
                $statusMessage.text('Sua inscrição foi finalizada com sucesso! Clique abaixo para prosseguir com o pagamento.');
                $goToPaymentBtn.data('payment-link', result.link).show();
            } else {
                $statusMessage.text('Inscrição finalizada com sucesso, mas não foi possível obter o link de pagamento. Por favor, entre em contato com a administração do Quintal das Artes.');
                $goToPaymentBtn.hide();
            }

            // ✅ ESCONDE O BOTÃO DE SUBMIT APÓS SUCESSO (já que mudamos para tela de sucesso)
            $submitBtn.hide();

        } catch (error) {
            // 3. Captura de erro (rede, servidor, timeout, ou response.ok false)
            console.error('Erro ao enviar inscrição:', error);

            $statusBox.removeClass('status-processing status-success').addClass('status-error');
            $statusHeading.html('❌ Erro!');

            // ✅ MENSAGEM ESPECÍFICA PARA TIMEOUT
            if (error.name === 'AbortError') {
                $statusMessage.text('A requisição demorou muito para responder. Por favor, verifique sua conexão e tente novamente.');
            } else {
                $statusMessage.text('Ocorreu um erro ao finalizar a inscrição. Por favor, tente novamente ou entre em contato.');
            }

            $goToPaymentBtn.hide();

            // ✅ REABILITA O BOTÃO EM CASO DE ERRO
            $submitBtn.prop('disabled', false).text(originalBtnText);
            isSubmitting = false;

            // ✅ VOLTA PARA O PASSO ANTERIOR (passo do resumo) PARA PERMITIR NOVA TENTATIVA
            showStep(5); // Volta para o passo de resumo financeiro

        } finally {
            // ✅ GARANTE QUE A FLAG SEJA RESETADA APENAS EM CASO DE SUCESSO
            // (em caso de erro, já foi resetada no catch)
            if ($statusBox.hasClass('status-success')) {
                // Não reseta isSubmitting em caso de sucesso para evitar reenvios
                console.log('✅ Submissão concluída com sucesso');
            }
        }
    }

    // Configura todos os event listeners
    function setupEventListeners() {
        console.log('Configurando event listeners...');

        // Navegação entre passos
        $('.btn-next').on('click', function () {
            console.log('Botão próximo clicado, passo atual:', currentStep);
            if (validateCurrentStep()) {
                if (currentStep < totalSteps + 1) { // totalSteps + 1 para incluir o passo de termos
                    showStep(currentStep + 1);
                }
            } else {
                alert('Por favor, preencha todos os campos obrigatórios corretamente antes de prosseguir.');
            }
        });

        $('.btn-prev').on('click', function () {
            console.log('Botão anterior clicado, passo atual:', currentStep);
            if (currentStep > 1) {
                showStep(currentStep - 1);
            }
        });

        // Event listener específico para o botão de submit
        $('.btn-submit').on('click', function (event) {
            console.log('Botão Finalizar Inscrição clicado!');
            event.preventDefault();
            event.stopPropagation();
            processFormSubmission();
        });

        // Previne o envio padrão do formulário
        $('#registrationForm').on('submit', function (event) {
            console.log('Form submit event interceptado');
            event.preventDefault();
            event.stopPropagation();
            return false;
        });

        // Adicionar/Remover Aprendiz
        $('.btn-add-apprentice').on('click', function () {
            addApprentice();
        });

        $('#apprenticesContainer').on('click', '.btn-remove-apprentice', function () {
            removeApprentice(this);
        });

        // Disparar cálculo ao mudar seleção de curso, plano ou cupom
        $('#registrationForm').on('change', '.course-checkbox, #planoPagamento', function () {
            if ($(this).hasClass('course-checkbox')) {
                updatePaymentPlanOptions();
            }
            updateSummaryAndTotal();
        });

        // Função para atualizar as opções do select de plano de pagamento
        function updatePaymentPlanOptions() {
            const $planoSelect = $('#planoPagamento');
            const currentSelectedPlan = $planoSelect.val();
            const allSelectedCourseIds = [];

            $('#apprenticesContainer .apprentice-group:not(.template)').each(function () {
                const selectedIds = getSelectedCourses($(this));
                allSelectedCourseIds.push(...selectedIds);
            });

            // Se não houver cursos, mantém as opções padrão
            if (allSelectedCourseIds.length === 0) return;

            // Coleta todos os planos possíveis dos cursos selecionados
            const availablePlans = new Set();
            const allCourses = priceCalculator.getAllCourses();

            allSelectedCourseIds.forEach(id => {
                const course = allCourses.find(c => c.id === id);
                if (course && course.precos) {
                    Object.keys(course.precos).forEach(planKey => availablePlans.add(planKey));
                }
            });

            // Limpa e repopula o select
            $planoSelect.empty();
            $planoSelect.append('<option value="">Selecione um plano de pagamento</option>');

            const allPlans = priceCalculator.getPricesData().planos;

            // Ordenar planos: avulso primeiro, depois os outros
            const sortedPlans = Object.keys(allPlans).sort((a, b) => {
                if (a === 'avulso') return -1;
                if (b === 'avulso') return 1;
                return 0;
            });

            sortedPlans.forEach(planKey => {
                if (availablePlans.has(planKey)) {
                    const plan = allPlans[planKey];
                    const selected = planKey === currentSelectedPlan ? 'selected' : '';
                    $planoSelect.append(`<option value="${planKey}" ${selected}>${plan.nome}</option>`);
                }
            });
        }

        // Toggle para Dia de Vencimento
        $('#formaPagamento').on('change', function () {
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

        $('#cupomCode').on('input', function () {
            const cupomFeedback = $('.cupom-feedback');
            const couponValue = $(this).val().toUpperCase();
            if (couponValue === '') {
                cupomFeedback.text('').removeClass('error success');
            } else if (priceCalculator.getCouponsData()[couponValue]) {
                cupomFeedback.text('Cupom válido!').addClass('success').removeClass('error');
            } else {
                cupomFeedback.text('Cupom inválido.').addClass('error').removeClass('success');
            }
            updateSummaryAndTotal();
        });

        // Live validation para CPF e Email em blur
        $('#cpfResponsavel').on('blur', function () {
            validateField(this, (val) => isValidCPF(val), 'CPF inválido.');
        });

        $('#emailResponsavel').on('blur', function () {
            validateField(this, (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), 'Email inválido.');
        });

        // Validação genérica para campos required em blur
        $('#registrationForm').on('blur', 'input[required], select[required], textarea[required]', function () {
            validateField(this);
        });

        // Validação "Como ficou sabendo" em change
        $('input[name="comoSoube"]').on('change', function () {
            const $howKnowCheckboxes = $('input[name="comoSoube"]');
            const $howKnowErrorDiv = $('.how-know-error');
            if ($howKnowCheckboxes.filter(':checked').length === 0) {
                $howKnowErrorDiv.text('Selecione pelo menos uma opção.').show();
            } else {
                $howKnowErrorDiv.hide().text('');
            }
        });

        // Validação de radio buttons de autorização de foto
        $('input[name="autorizaFoto"]').on('change', function () {
            const $photoConsentRadios = $('input[name="autorizaFoto"]');
            const $photoConsentErrorDiv = $('.photo-consent-error');
            if ($photoConsentRadios.filter(':checked').length === 0) {
                $photoConsentErrorDiv.text('Selecione uma opção para autorização de uso de imagem.').show();
            } else {
                $photoConsentErrorDiv.hide().text('');
            }
        });

        // Botão de redirecionamento para pagamento
        $('#goToPaymentBtn').on('click', function () {
            const paymentLink = $(this).data('payment-link');
            if (paymentLink) {
                window.open(paymentLink, '_blank');
            }
        });

        console.log('Event listeners configurados com sucesso!');
    }

    // Inicia o formulário quando o DOM estiver pronto
    initForm();
});
