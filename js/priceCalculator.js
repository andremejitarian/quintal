// js/priceCalculator.js

let pricesData = null;
let couponsData = null;

// Função para carregar os dados JSON
async function loadPriceData() {
    try {
        const [pricesResponse, couponsResponse] = await Promise.all([
            fetch('precos.json'),
            fetch('cupons.json')
        ]);

        if (!pricesResponse.ok) throw new Error('Erro ao carregar precos.json');
        if (!couponsResponse.ok) throw new Error('Erro ao carregar cupons.json');

        pricesData = await pricesResponse.json();
        couponsData = await couponsResponse.json();

        console.log('Dados de preços e cupons carregados:', { pricesData, couponsData });
        return true;
    } catch (error) {
        console.error('Erro ao carregar dados de preços/cupons:', error);
        alert('Ocorreu um erro ao carregar os dados de preços. Por favor, tente novamente mais tarde.');
        return false;
    }
}

/**
 * Obtém todos os cursos e contraturnos disponíveis
 * @returns {Array} Array com todos os cursos e contraturnos
 */
function getAllCourses() {
    if (!pricesData) return [];
    
    const allCourses = [];
    
    // Adiciona cursos
    Object.keys(pricesData.cursos).forEach(courseId => {
        allCourses.push({
            id: courseId,
            categoria: 'curso', // Adiciona categoria para facilitar a separação
            ...pricesData.cursos[courseId]
        });
    });
    
    // Adiciona contraturnos
    Object.keys(pricesData.contraturnos).forEach(courseId => {
        allCourses.push({
            id: courseId,
            categoria: 'contraturno', // Adiciona categoria para facilitar a separação
            ...pricesData.contraturnos[courseId]
        });
    });
    
    return allCourses;
}

/**
 * Obtém o preço de um curso específico para um plano específico
 * @param {string} courseId - ID do curso
 * @param {string} planKey - Chave do plano (mensal, bimestral, trimestral)
 * @returns {number} Preço do curso para o plano
 */
function getCoursePrice(courseId, planKey) {
    if (!pricesData) return 0;
    
    // Verifica se é um curso
    if (pricesData.cursos[courseId]) {
        return pricesData.cursos[courseId].precos[planKey] || 0;
    }
    
    // Verifica se é um contraturno
    if (pricesData.contraturnos[courseId]) {
        return pricesData.contraturnos[courseId].precos[planKey] || 0;
    }
    
    return 0;
}

/**
 * Obtém os detalhes completos de um curso pelo ID
 * @param {string} courseId - ID do curso
 * @returns {Object|null} Objeto com detalhes do curso ou null se não encontrado
 */
function getCourseById(courseId) {
    if (!pricesData) return null;
    
    // Verifica se é um curso
    if (pricesData.cursos[courseId]) {
        return {
            id: courseId,
            categoria: 'curso',
            ...pricesData.cursos[courseId]
        };
    }
    
    // Verifica se é um contraturno
    if (pricesData.contraturnos[courseId]) {
        return {
            id: courseId,
            categoria: 'contraturno',
            ...pricesData.contraturnos[courseId]
        };
    }
    
    return null;
}

/**
 * Calcula o total da inscrição com base nos cursos selecionados, plano de pagamento e cupom.
 * @param {Array<string>} selectedCourseIds - Array de IDs dos cursos selecionados
 * @param {string} paymentPlanKey - Chave do plano de pagamento (mensal, bimestral, trimestral)
 * @param {string} couponCode - Código do cupom
 * @param {string} paymentMethod - Método de pagamento (Cartão de Crédito, PIX/Boleto, Bolsista Integral)
 * @param {number} apprenticesCount - Número de aprendizes (para desconto de irmãos)
 * @returns {Object} Objeto contendo detalhes do cálculo
 */
function calculateTotal(selectedCourseIds, paymentPlanKey, couponCode, paymentMethod = '', apprenticesCount = 1) {
    if (!pricesData || !couponsData) {
        console.error("Dados de preços ou cupons não carregados.");
        return { 
            subtotal: 0, 
            discountAmount: 0, 
            couponAmount: 0, 
            cardFee: 0, 
            total: 0,
            coursesDetails: [],
            appliedDiscounts: []
        };
    }

    let subtotal = 0;
    let coursesDetails = [];
    let appliedDiscounts = [];

    // 1. Calcular subtotal e coletar detalhes dos cursos
    if (selectedCourseIds && selectedCourseIds.length > 0) {
        selectedCourseIds.forEach(courseId => {
            const price = getCoursePrice(courseId, paymentPlanKey);
            const courseName = getCourseNameById(courseId);
            
            subtotal += price;
            coursesDetails.push({
                id: courseId,
                name: courseName,
                price: price,
                planPrice: price
            });
        });
    }

    let currentTotal = subtotal;
    let discountAmount = 0;
    let couponAmount = 0;
    let cardFee = 0;

    // 2 e 3. Aplicar desconto de múltiplos cursos OU desconto de irmãos (não cumulativos)
    if (selectedCourseIds.length > 1 || apprenticesCount > 1) {
        const lowestPrice = Math.min(...coursesDetails.map(c => c.price));

        if (selectedCourseIds.length > 1) {
            // Desconto múltiplos cursos tem prioridade
            const multipleCoursesDiscount = lowestPrice * pricesData.descontos.multiplos_cursos.percentual;
            discountAmount += multipleCoursesDiscount;
            currentTotal -= multipleCoursesDiscount;
            appliedDiscounts.push({
                type: 'multiplos_cursos',
                name: pricesData.descontos.multiplos_cursos.nome,
                amount: multipleCoursesDiscount
            });
        } else if (apprenticesCount > 1) {
            // Só aplica o desconto de irmãos se não tiver múltiplos cursos
            const brotherDiscount = lowestPrice * pricesData.descontos.irmaos.percentual;
            discountAmount += brotherDiscount;
            currentTotal -= brotherDiscount;
            appliedDiscounts.push({
                type: 'irmaos',
                name: pricesData.descontos.irmaos.nome,
                amount: brotherDiscount
            });
        }
    }

    // 4. Aplicar desconto do cupom
    if (couponCode) {
        const normalizedCouponCode = couponCode.toUpperCase();
        const coupon = couponsData[normalizedCouponCode];

        if (coupon) {
            if (coupon.tipo === 'percentual') {
                couponAmount = currentTotal * coupon.valor;
                if (coupon.maxDesconto && couponAmount > coupon.maxDesconto) {
                    couponAmount = coupon.maxDesconto;
                }
            } else if (coupon.tipo === 'fixo') {
                couponAmount = coupon.valor;
            }
            couponAmount = Math.min(couponAmount, currentTotal);
            currentTotal -= couponAmount;
        }
    }

    // 5. Aplicar taxa de cartão (se cartão de crédito)
    if (paymentMethod === 'Cartão de Crédito' && pricesData.planos[paymentPlanKey]) {
        const plan = pricesData.planos[paymentPlanKey];
        if (plan.taxaCartaoPercentual) {
            cardFee = currentTotal * plan.taxaCartaoPercentual;
            currentTotal += cardFee;
        }
    }

    // 6. Aplicar desconto de bolsista integral (zera o valor)
    if (paymentMethod === 'Bolsista Integral') {
        const scholarshipDiscount = currentTotal;
        discountAmount += scholarshipDiscount;
        currentTotal = 0;
        appliedDiscounts.push({
            type: 'bolsistas100',
            name: pricesData.descontos.bolsistas100.nome,
            amount: scholarshipDiscount
        });
    }

    return {
        subtotal: parseFloat(subtotal.toFixed(2)),
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        couponAmount: parseFloat(couponAmount.toFixed(2)),
        cardFee: parseFloat(cardFee.toFixed(2)),
        total: parseFloat(currentTotal.toFixed(2)),
        coursesDetails: coursesDetails,
        appliedDiscounts: appliedDiscounts,
        paymentPlan: pricesData.planos[paymentPlanKey]
    };
}


/**
 * Obtém o nome de um curso pelo ID
 * @param {string} courseId - ID do curso
 * @returns {string} Nome do curso
 */
function getCourseNameById(courseId) {
    if (!pricesData) return courseId;
    
    if (pricesData.cursos[courseId]) {
        return pricesData.cursos[courseId].nome;
    }
    
    if (pricesData.contraturnos[courseId]) {
        return pricesData.contraturnos[courseId].nome;
    }
    
    return courseId;
}

/**
 * Obtém informações sobre um plano de pagamento
 * @param {string} planKey - Chave do plano (mensal, bimestral, trimestral)
 * @returns {Object|null} Objeto com informações do plano ou null se não encontrado
 */
function getPaymentPlanInfo(planKey) {
    if (!pricesData || !pricesData.planos[planKey]) return null;
    
    return pricesData.planos[planKey];
}

/**
 * Verifica se um cupom é válido
 * @param {string} couponCode - Código do cupom
 * @returns {boolean} true se o cupom for válido, false caso contrário
 */
function isValidCoupon(couponCode) {
    if (!couponsData || !couponCode) return false;
    
    const normalizedCouponCode = couponCode.toUpperCase();
    return !!couponsData[normalizedCouponCode];
}

/**
 * Obtém informações sobre um cupom
 * @param {string} couponCode - Código do cupom
 * @returns {Object|null} Objeto com informações do cupom ou null se não encontrado
 */
function getCouponInfo(couponCode) {
    if (!couponsData || !couponCode) return null;
    
    const normalizedCouponCode = couponCode.toUpperCase();
    return couponsData[normalizedCouponCode] || null;
}

/**
 * Formata um valor monetário para exibição no padrão brasileiro
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado como "R$ 1.245,67"
 */
function formatCurrency(value) {
    // Converte para número se for string
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    // Verifica se é um número válido
    if (isNaN(numValue)) return 'R$ 0,00';
    
    // Formata o número usando toLocaleString para padrão brasileiro
    return numValue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

/**
 * Obtém todos os planos de pagamento disponíveis
 * @returns {Object} Objeto com todos os planos de pagamento
 */
function getAllPaymentPlans() {
    if (!pricesData || !pricesData.planos) return {};
    
    return pricesData.planos;
}

/**
 * Calcula o desconto percentual de um plano em relação ao mensal
 * @param {string} planKey - Chave do plano
 * @param {string} courseId - ID do curso
 * @returns {number} Percentual de desconto (0 a 1)
 */
function calculatePlanDiscount(planKey, courseId) {
    if (!pricesData || planKey === 'mensal') return 0;
    
    const monthlyPrice = getCoursePrice(courseId, 'mensal');
    const planPrice = getCoursePrice(courseId, planKey);
    
    if (monthlyPrice === 0) return 0;
    
    return (monthlyPrice - planPrice) / monthlyPrice;
}

// Exportar funções para serem acessíveis em script.js
window.priceCalculator = {
    // Funções principais
    loadPriceData,
    calculateTotal,
    
    // Funções de consulta de cursos
    getAllCourses,
    getCoursePrice,
    getCourseNameById,
    getCourseById,
    
    // Funções de planos de pagamento
    getPaymentPlanInfo,
    getAllPaymentPlans,
    calculatePlanDiscount,
    
    // Funções de cupons
    isValidCoupon,
    getCouponInfo,
    
    // Funções utilitárias
    formatCurrency,
    
    // Getters para dados brutos
    getPricesData: () => pricesData,
    getCouponsData: () => couponsData
};
