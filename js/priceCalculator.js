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
 * Calcula o total da inscrição com base nos cursos selecionados, plano de pagamento e cupom.
 * Regras:
 * 1. O plano de pagamento e o desconto são globais para todos os cursos.
 * 2. O desconto do plano de pagamento (se 'a_vista') é aplicado *apenas* no curso de menor valor.
 * 3. A ordem de cálculo é: Desconto do Plano -> Desconto do Cupom -> Taxa de Cartão.
 * @param {Array<Object>} selectedCourses - Array de objetos de curso selecionados (vindos do pricesData.cursos).
 * @param {string} paymentPlanKey - Chave do plano de pagamento ('a_vista' ou 'parcelado').
 * @param {string} couponCode - Código do cupom.
 * @returns {Object} Objeto contendo subtotal, desconto do plano, desconto do cupom, taxa de cartão e total final.
 */
function calculateTotal(selectedCourses, paymentPlanKey, couponCode) {
    if (!pricesData || !couponsData) {
        console.error("Dados de preços ou cupons não carregados.");
        return { subtotal: 0, discountAmount: 0, couponAmount: 0, cardFee: 0, total: 0 };
    }

    let subtotal = 0;
    let lowestCourseValue = Infinity;
    let discountAmount = 0;
    let couponAmount = 0;
    let cardFee = 0;

    // 1. Calcular subtotal e identificar o curso de menor valor
    if (selectedCourses && selectedCourses.length > 0) {
        selectedCourses.forEach(course => {
            subtotal += course.valor;
            if (course.valor < lowestCourseValue) {
                lowestCourseValue = course.valor;
            }
        });
    }

    let currentTotal = subtotal;

    // 2. Aplicar Desconto do Plano de Pagamento (apenas se 'a_vista' e no curso de menor valor)
    const paymentPlan = pricesData.planosPagamento[paymentPlanKey];
    if (paymentPlan && paymentPlan.descontoPercentualNoCursoMenorValor > 0 && lowestCourseValue !== Infinity) {
        discountAmount = lowestCourseValue * paymentPlan.descontoPercentualNoCursoMenorValor;
        currentTotal -= discountAmount;
    }

    // 3. Aplicar Desconto do Cupom (sobre o total atual)
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
            // Garante que o desconto do cupom não torne o total negativo
            couponAmount = Math.min(couponAmount, currentTotal);
            currentTotal -= couponAmount;
        }
    }

    // 4. Aplicar Taxa de Cartão (se 'parcelado' e sobre o total final após descontos)
    if (paymentPlan && paymentPlan.taxaCartaoPercentual > 0 && paymentPlanKey === 'parcelado') { // Aplica taxa apenas se for 'parcelado'
        cardFee = currentTotal * paymentPlan.taxaCartaoPercentual;
        currentTotal += cardFee;
    }

    return {
        subtotal: parseFloat(subtotal.toFixed(2)),
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        couponAmount: parseFloat(couponAmount.toFixed(2)),
        cardFee: parseFloat(cardFee.toFixed(2)),
        total: parseFloat(currentTotal.toFixed(2))
    };
}

// Exportar funções para serem acessíveis em script.js
window.priceCalculator = {
    loadPriceData,
    calculateTotal,
    getPricesData: () => pricesData,
    getCouponsData: () => couponsData
};
