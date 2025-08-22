// Cache para dados de preços e cupons
let precosData = null;
let cuponsData = null;

// Carrega dados necessários
async function carregarDados() {
    if (!precosData) {
        const responsePrecos = await fetch('precos.json');
        precosData = await responsePrecos.json();
    }
    if (!cuponsData) {
        const responseCupons = await fetch('cupons.json');
        cuponsData = await responseCupons.json();
    }
}

// Função principal de cálculo
async function calcularValorTotal(detalhesMatricula) {
    await carregarDados();
    
    // 1. Calcula valor base dos cursos
    let valorBase = calcularValorBaseCursos(detalhesMatricula);
    
    // 2. Aplica desconto (no curso de menor valor, se aplicável)
    let valorComDesconto = aplicarDesconto(valorBase, detalhesMatricula);
    
    // 3. Aplica cupom (se houver)
    let valorComCupom = aplicarCupom(valorComDesconto, detalhesMatricula.cupom);
    
    // 4. Adiciona taxa de cartão (se aplicável)
    let valorFinal = aplicarTaxaCartao(valorComCupom, detalhesMatricula.formaPagamento);
    
    return valorFinal;
}

// Calcula o valor base dos cursos selecionados
function calcularValorBaseCursos(detalhesMatricula) {
    const plano = detalhesMatricula.plano;
    let valorTotal = 0;
    
    // Para cada aprendiz
    detalhesMatricula.aprendizes.forEach(aprendiz => {
        aprendiz.cursos.forEach(cursoId => {
            const curso = precosData.cursos[cursoId];
            if (curso) {
                valorTotal += curso.precos[plano];
            }
        });
    });
    
    return valorTotal;
}

// Aplica desconto no curso de menor valor
function aplicarDesconto(valorBase, detalhesMatricula) {
    if (!detalhesMatricula.desconto) return valorBase;
    
    const desconto = precosData.descontos[detalhesMatricula.desconto];
    if (!desconto) return valorBase;
    
    // Encontra o curso de menor valor
    let menorValor = Infinity;
    detalhesMatricula.aprendizes.forEach(aprendiz => {
        aprendiz.cursos.forEach(cursoId => {
            const curso = precosData.cursos[cursoId];
            if (curso) {
                const valorCurso = curso.precos[detalhesMatricula.plano];
                if (valorCurso < menorValor) {
                    menorValor = valorCurso;
                }
            }
        });
    });
    
    // Calcula o desconto
    const valorDesconto = (menorValor * desconto.percentual) / 100;
    return valorBase - valorDesconto;
}

// Aplica cupom de desconto
function aplicarCupom(valor, codigoCupom) {
    if (!codigoCupom || !cuponsData[codigoCupom]) return valor;
    
    const cupom = cuponsData[codigoCupom];
    const hoje = new Date();
    const dataExpiracao = new Date(cupom.expira_em);
    
    // Verifica se o cupom está válido
    if (hoje > dataExpiracao) return valor;
    
    // Verifica valor mínimo
    if (valor < cupom.minimo_compra) return valor;
    
    // Aplica o desconto
    if (cupom.tipo === 'percentual') {
        return valor - (valor * cupom.valor / 100);
    } else if (cupom.tipo === 'fixo') {
        return valor - cupom.valor;
    }
    
    return valor;
}

// Aplica taxa de cartão
function aplicarTaxaCartao(valor, formaPagamento) {
    // Se for pagamento em cartão, adiciona 2.5% de taxa
    if (formaPagamento === 'cartao') {
        return valor * 1.025;
    }
    return valor;
}

// Função para validar cupom
function validarCupom(codigoCupom, valorTotal) {
    if (!cuponsData || !cuponsData[codigoCupom]) {
        return {
            valido: false,
            mensagem: 'Cupom inválido'
        };
    }

    const cupom = cuponsData[codigoCupom];
    const hoje = new Date();
    const dataExpiracao = new Date(cupom.expira_em);

    if (hoje > dataExpiracao) {
        return {
            valido: false,
            mensagem: 'Cupom expirado'
        };
    }

    if (valorTotal < cupom.minimo_compra) {
        return {
            valido: false,
            mensagem: `Valor mínimo para este cupom: R$ ${cupom.minimo_compra.toFixed(2)}`
        };
    }

    return {
        valido: true,
        mensagem: 'Cupom aplicado com sucesso!',
        desconto: cupom.tipo === 'percentual' ? 
            (valorTotal * cupom.valor / 100) : 
            cupom.valor
    };
}

// Função para atualizar o resumo de valores na interface
function atualizarResumoValores(valorTotal, detalhesMatricula) {
    const container = document.getElementById('valores-container');
    let html = '';

    // Valor base
    const valorBase = calcularValorBaseCursos(detalhesMatricula);
    html += `<div class="valor-item">
        <span>Valor dos cursos:</span>
        <span>R$ ${valorBase.toFixed(2)}</span>
    </div>`;

    // Desconto (se houver)
    if (detalhesMatricula.desconto) {
        const valorComDesconto = aplicarDesconto(valorBase, detalhesMatricula);
        const valorDesconto = valorBase - valorComDesconto;
        html += `<div class="valor-item desconto">
            <span>Desconto aplicado:</span>
            <span>-R$ ${valorDesconto.toFixed(2)}</span>
        </div>`;
    }

    // Cupom (se houver)
    if (detalhesMatricula.cupom) {
        const validacao = validarCupom(detalhesMatricula.cupom, valorTotal);
        if (validacao.valido) {
            html += `<div class="valor-item cupom">
                <span>Cupom ${detalhesMatricula.cupom}:</span>
                <span>-R$ ${validacao.desconto.toFixed(2)}</span>
            </div>`;
        }
    }

    // Taxa de cartão (se aplicável)
    if (detalhesMatricula.formaPagamento === 'cartao') {
        const taxaCartao = valorTotal * 0.025;
        html += `<div class="valor-item taxa">
            <span>Taxa cartão (2.5%):</span>
            <span>R$ ${taxaCartao.toFixed(2)}</span>
        </div>`;
    }

    // Valor final
    html += `<div class="valor-item total">
        <span>Valor total:</span>
        <span>R$ ${valorTotal.toFixed(2)}</span>
    </div>`;

    container.innerHTML = html;
}

// Exporta as funções necessárias
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calcularValorTotal,
        validarCupom,
        atualizarResumoValores
    };
}
