## Documento de Requisitos de Produto (PRD) - Quintal das Artes (Versão 2.4)

### 1. Introdução

#### 1.1. Propósito
Este Documento de Requisitos de Produto (PRD) descreve o formulário de inscrição online do "Quintal das Artes", agora com capacidade de gerenciar matrículas de múltiplos alunos e cursos por responsável. Ele detalha o escopo, as funcionalidades, o fluxo do usuário e os requisitos técnicos para a construção e operação do sistema, visando formalizar, otimizar e agilizar o processo de matrícula, especialmente rematrículas via pré-preenchimento de dados, e aprimorar a retenção de clientes.

#### 1.2. Público-alvo
*   **Usuários Finais:** Responsáveis (pais, mães ou guardiões) que desejam inscrever uma ou mais crianças em um ou mais cursos e contraturnos do Quintal das Artes.
*   **Administração Quintal das Artes:** Equipe responsável por gerenciar as inscrições, dados dos alunos e pagamentos.

#### 1.3. Objetivos
*   Simplificar o processo de inscrição para os responsáveis, permitindo a matrícula de múltiplos alunos e cursos em uma única transação.
*   Coletar de forma eficiente todas as informações necessárias sobre os aprendizes e o responsável.
*   Fornecer clareza sobre os cursos, planos de pagamento, descontos e termos da escola.
*   Implementar validação de CPF robusta via script interno.
*   Apresentar o valor total do pacote de cursos de forma transparente, considerando descontos e cupons.
*   Aprimorar o processo de rematrícula através do pré-preenchimento de todos os campos do formulário via um token de matrícula na URL, otimizando a experiência do usuário e suportando estratégias de retenção.
*   Integrar-se com sistemas de processamento de pagamentos externos.
*   Reduzir a carga administrativa manual da equipe do Quintal das Artes.

### 2. Visão Geral do Produto

O Formulário de Inscrição "Quintal das Artes" é uma aplicação web de página única (SPA) que guia o usuário através de um processo de registro flexível e dividido em etapas, culminando em uma tela de sucesso com um link para pagamento externo. Ele foi projetado para ser intuitivo, permitindo ao responsável adicionar múltiplos alunos e selecionar cursos para cada um, com cálculo de valores e aplicação de descontos e cupons em tempo real. Uma funcionalidade chave é o **pré-preenchimento dinâmico de todos os campos do formulário**, incluindo múltiplos aprendizes e seus cursos, a partir de dados fornecidos por um webhook, ativado por um token de matrícula na URL (ex: `https://formulariodoquintal.com/?matricula=003`). Utiliza dados dinâmicos de cursos, preços e regras de cupom, buscando otimizar o processo de rematrícula e a experiência do usuário. O plano de pagamento e a seleção de desconto são aplicados ao pacote de cursos como um todo, e não individualmente por curso ou aprendiz.

### 3. Fluxo do Usuário

O fluxo de inscrição é linear e adaptável, guiando o usuário passo a passo:

1.  **Acesso ao Formulário:**
    *   O usuário acessa o formulário via URL.
    *   Se a URL contiver um parâmetro `matricula` (ex: `https://formulariodoquintal.com/?matricula=003`), o formulário fará uma chamada `fetch` para um webhook do N8N usando este token.
    *   Os dados retornados pelo webhook serão utilizados para **pré-preencher automaticamente todos os campos aplicáveis** do formulário (dados do responsável, dos aprendizes, cursos selecionados, plano de pagamento, seleção de desconto, forma de pagamento, etc.). Um campo oculto `matricula` será preenchido com o valor do token da URL.

2.  **Etapa 1: Dados do Responsável e Inscrição dos Aprendizes:**
    *   Os campos podem já vir pré-preenchidos. O usuário revisa e, se necessário, edita as informações.
    *   O usuário preenche os dados do responsável.
    *   Adiciona o primeiro aprendiz, preenche suas informações (pessoais, saúde/emergência) e seleciona os cursos para este aprendiz.
    *   O formulário permite adicionar múltiplos aprendizes. Para cada aprendiz adicionado, um novo bloco de campos de informação pessoal e seleção de cursos é apresentado.
    *   Para cada aprendiz, é possível selecionar um ou mais cursos.
    *   O usuário seleciona o **Plano de Pagamento** (Mensal, Bimestral, Quadrimestral) para todos os cursos escolhidos, e o **Desconto** a ser aplicado, se houver (o desconto será aplicado sobre o curso de menor valor, conforme RF.4.1.1).
    *   A cada seleção de curso, plano ou desconto, o valor total provisório é atualizado dinamicamente.
    *   O usuário seleciona como soube do Quintal das Artes.
    *   Um campo para inserção de "Cupom de Desconto" é exibido. Se um cupom válido for inserido (ou automaticamente aplicado via pré-preenchimento), o valor total é recalculado.
    *   O valor total do pacote de cursos é calculado e exibido dinamicamente, considerando as regras de desconto e cupom.
    *   O responsável seleciona a forma de pagamento e, se aplicável (PIX/Boleto), o dia de vencimento.
    *   Ao clicar em "Continuar", o formulário valida os campos obrigatórios e realiza uma validação interna do CPF.

3.  **Etapa 2: Termos e Condições:**
    *   Após validação da Etapa 1, o usuário é direcionado para a Etapa 2.
    *   São exibidos os Termos e Condições do Quintal das Artes.
    *   O usuário deve aceitar os termos e selecionar uma opção para a autorização de uso de imagem.
    *   Ao clicar em "Enviar Cadastro", o formulário valida os campos obrigatórios da Etapa 2 e submete todos os dados para um webhook externo.

4.  **Etapa Final: Confirmação e Pagamento:**
    *   Após a submissão bem-sucedida, o usuário é direcionado para uma tela de sucesso.
    *   Esta tela informa que a inscrição está quase completa e que o link de pagamento será enviado por e-mail e também está disponível na tela.
    *   Um botão "Ir para o pagamento agora" redireciona o usuário para o link de pagamento externo fornecido pelo webhook.

### 4. Requisitos Funcionais

#### 4.1. RF.1 - Inscrição Multi-etapas com Múltiplos Aprendizes e Cursos

O formulário deve ser dividido em duas etapas para melhorar a experiência do usuário e gerenciar a complexidade das informações, permitindo a inscrição de múltiplos aprendizes e seus respectivos cursos.

*   **RF.1.1 - Etapa 1: Dados do Responsável e Inscrição de Aprendizes**
    *   **RF.1.1.1 - Campos de Informação do Responsável:**
        *   Qual o nome do(a) responsável? (texto, obrigatório)
        *   Qual o CPF do(a) responsável? (texto com máscara "000.000.000-00", obrigatório, validação interna via script)
        *   Qual o telefone de contato? (texto com máscara "(00) 00000-0000", obrigatório)
        *   E-mail (e-mail, obrigatório)
        *   Qual o endereço? (área de texto, opcional)
        *   Qual o nome do(a) segundo(a) responsável? (texto, opcional)
        *   Qual o telefone de contato do segundo responsável? (texto com máscara "(00) 00000-0000", opcional)
    *   **RF.1.1.2 - Campo Oculto `matricula`:**
        *   Um campo oculto (`<input type="hidden" id="matricula" name="matricula">`) deve ser adicionado ao formulário.
        *   Este campo será preenchido com o valor do parâmetro `matricula` da URL, se presente.
        *   O valor deste campo (`matricula`) será enviado para o webhook de submissão do formulário para rastreabilidade no backend.
    *   **RF.1.1.3 - Seção de Inscrição de Aprendizes (Repetível):**
        *   Deve haver um botão "Adicionar Outro Aprendiz" que, ao ser clicado, duplica um bloco de campos de aprendiz.
        *   Cada bloco de aprendiz deve incluir:
            *   **Campos de Informação do Aprendiz:**
                *   Nome completo do(a) aprendiz (texto, obrigatório)
                *   Em qual escola estuda? (texto, opcional)
                *   Qual a data de nascimento? (data, obrigatório)
            *   **Campos de Informação de Saúde/Emergência (por aprendiz):**
                *   Gostaríamos de saber se a criança tem alguma restrição alimentar. Se sim, qual? (área de texto, obrigatório)
                *   Gostaríamos de saber se a criança tem alguma questão de saúde. Se sim, qual? (área de texto, obrigatório)
                *   Em caso de emergência, quem devemos chamar para este aprendiz? (área de texto, obrigatório)
            *   **Seleção de Curso/Modalidade (múltipla, por aprendiz):**
                *   Deve permitir selecionar um ou mais cursos para cada aprendiz.
                *   Dropdowns/Checkboxes populados dinamicamente com opções de cursos e contraturnos a partir do arquivo `precos.json`.
                *   **NOVO:** No dropdown de seleção de cursos, as opções devem ser agrupadas em duas seções distintas: primeiramente "Contraturnos" e, em seguida, "Cursos", para melhor organização visual.
                *   (obrigatório selecionar ao menos um curso por aprendiz)
    *   **RF.1.1.4 - Campo "Como ficou sabendo":**
        *   Conjunto de checkboxes para seleção múltipla (Instagram, Amigos, Na escola, Casa Lebre, Flyer, Eventos no Quintal, Passei em frente). Pelo menos uma opção deve ser selecionada (obrigatório).
    *   **RF.1.1.5 - Seleção de Plano de Pagamento:**
        *   Dropdown populado dinamicamente com opções de planos (Mensal, Bimestral, Quadrimestral) (`precos.json`). (obrigatório)
        *   Este plano será aplicado a **todos os cursos selecionados** no formulário.
    *   **RF.1.1.6 - Seleção de Desconto:**
        *   Dropdown populado dinamicamente com opções de desconto (`precos.json`). (opcional)
        *   Este desconto será aplicado ao pacote total de cursos conforme a lógica de RF.4.1.1.
        *   Deve exibir aviso de que descontos pré-definidos (via `precos.json`) não são cumulativos entre si.
    *   **RF.1.1.7 - Campo "Cupom de Desconto":**
        *   Campo de texto para inserção de um código de cupom. (opcional)
        *   Deve haver um botão "Aplicar" que, ao ser clicado, valida o cupom e recalcula o valor total.
        *   Mensagens de feedback (cupom aplicado, cupom inválido) devem ser exibidas.
    *   **RF.1.1.8 - Cálculo e Exibição do Valor Total do Pacote:**
        *   Um campo destacado na tela deve exibir o **valor total do pacote de cursos**, calculado com base em:
            1.  Aplicação da regra de desconto sobre o curso de menor valor (RF.4.1.1).
            2.  Cálculo do subtotal dos cursos (já com desconto aplicado).
            3.  Aplicação do cupom de desconto sobre o subtotal (RF.4.1.2).
            4.  Aplicação da taxa de cartão de crédito sobre o valor final (RF.4.1.3).
        *   Um campo oculto (`valor_calculado_total`) deve armazenar o valor final total.
        *   Um campo oculto (`detalhes_matricula`) deve armazenar um objeto JSON com todos os detalhes da matrícula (responsável, lista de aprendizes com seus cursos, etc.).
    *   **RF.1.1.9 - Seleção de Forma de Pagamento:**
        *   Dropdown com opções: "PIX/Boleto", "Cartão de Crédito", "Bolsista Integral". (obrigatório)
        *   Todas as opções de plano (Mensal, Bimestral, Quadrimestral) permitem pagamento com Cartão de Crédito.
    *   **RF.1.1.10 - Seleção de Dia de Vencimento:**
        *   Dropdown com opções "Dia 5", "Dia 10", "Dia 15". (obrigatório)
        *   Este campo deve ser visível e obrigatório apenas se a forma de pagamento selecionada for "PIX/Boleto".

*   **RF.1.2 - Etapa 2: Termos e Condições**
    *   **RF.1.2.1 - Exibição de Termos de Acordo:**
        *   Apresentar o texto completo dos termos e condições do Quintal das Artes.
    *   **RF.1.2.2 - Checkbox de Aceite de Termos:**
        *   Checkbox "Eu li e concordo com os termos e condições". (obrigatório para continuar)
    *   **RF.1.2.3 - Radio buttons para Autorização de Uso de Imagem:**
        *   Duas opções: "Sim, autorizo..." e "Não, não autorizo...". (obrigatório selecionar uma)

*   **RF.1.3 - Etapa Final: Confirmação e Pagamento**
    *   **RF.1.3.1 - Mensagem de Confirmação:**
        *   Exibir uma mensagem clara de que a inscrição está quase completa e o pagamento finaliza o processo.
    *   **RF.1.3.2 - Botão de Redirecionamento para Pagamento Externo:**
        *   Um botão "Ir para o pagamento agora" que redireciona o usuário para um link de pagamento externo recebido do backend.

#### 4.2. RF.2 - Validação de Dados

O formulário deve garantir a integridade e completude dos dados submetidos.

*   **RF.2.1 - Validação de Campos Obrigatórios (Frontend):**
    *   Todos os campos marcados com `required` no HTML devem ser preenchidos antes de avançar entre as etapas ou submeter o formulário.
    *   Feedback visual (`input-error`) deve ser fornecido para campos não preenchidos ou inválidos.
*   **RF.2.2 - Validação de CPF via Script Interno:**
    *   O CPF do responsável deve ser validado usando um script JavaScript interno (algoritmo de validação de CPF) antes de permitir que o usuário avance para a Etapa 2.
    *   Mensagens de erro claras devem ser exibidas em caso de CPF inválido.
*   **RF.2.3 - Validação de Seleção "Como ficou sabendo":**
    *   Pelo menos um checkbox da seção "Como ficou sabendo" deve ser selecionado.
*   **RF.2.4 - Validação de Aceite de Termos:**
    *   O checkbox "Eu li e concordo com os termos e condições" deve ser marcado antes da submissão final.
*   **RF.2.5 - Validação de Autorização de Imagem:**
    *   Uma das opções de rádio para autorização de uso de imagem deve ser selecionada antes da submissão final.

#### 4.3. RF.3 - Integração com Dados de Preço e Cupons

*   **RF.3.1 - Carregamento Dinâmico de Cursos, Planos e Descontos:**
    *   O formulário deve carregar dinamicamente todas as opções de cursos, contraturnos, planos de pagamento e descontos a partir do arquivo **`precos.json`**, que consolidará essas informações.
    *   Em caso de falha no carregamento, um alerta deve ser exibido ao usuário.
*   **RF.3.2 - Carregamento Dinâmico de Regras de Cupons:**
    *   O formulário deve carregar dinamicamente as regras de cupons a partir do arquivo `cupons.json`.
    *   A estrutura esperada para `cupons.json` deve permitir cupons de percentual ou valor fixo, aplicáveis sobre o total dos cursos.
    *   Exemplo de estrutura `cupons.json`:
        ```json
        {
          "CUPOM10OFF": {
            "tipo": "percentual",
            "valor": 10,
            "minimo_compra": 100,
            "expira_em": "2025-12-31"
          },
          "GANHA50": {
            "tipo": "fixo",
            "valor": 50,
            "minimo_compra": 200,
            "expira_em": "2025-11-30"
          }
        }
        ```

#### 4.4. RF.4 - Lógica de Preço, Desconto e Cupom

*   **RF.4.1 - Cálculo do Valor Total do Pacote:**
    *   **RF.4.1.1 - Aplicação de Desconto sobre o Curso de Menor Valor:**
        *   Com base na opção de desconto selecionada (ex: "Desconto Irmão", "Desconto Família"), o percentual de desconto correspondente (`precos.json`) deve ser aplicado **apenas sobre o valor do curso com o menor preço** dentre *todos os cursos selecionados* no formulário.
        *   Se houver múltiplos cursos com o mesmo menor valor, o desconto deve ser aplicado a apenas um deles.
        *   Este desconto é aplicado *antes* da aplicação do cupom e das taxas de cartão de crédito.
    *   **RF.4.1.2 - Aplicação de Cupom de Desconto:**
        *   Após a aplicação do desconto de RF.4.1.1 e o cálculo do subtotal dos cursos, o cupom de desconto (se válido e aplicado) será aplicado sobre este **subtotal dos cursos**.
        *   Se `tipo` for "percentual", o `valor` é subtraído do subtotal.
        *   Se `tipo` for "fixo", o `valor` é subtraído do subtotal.
        *   Validações como `minimo_compra` e `expira_em` devem ser realizadas.
    *   **RF.4.1.3 - Aplicação de Taxa para Pagamento com Cartão de Crédito:**
        *   Se a forma de pagamento for "Cartão de Crédito", uma taxa de 3.99% + R$ 0.49 (fixo) deve ser adicionada ao valor final (após descontos e cupons).
        *   Um aviso sobre esta taxa deve ser exibido junto ao preço.
*   **RF.4.2 - Armazenamento de Valor Calculado e Detalhes da Matrícula:**
    *   O valor final total (com ou sem taxa de cartão) deve ser armazenado no campo oculto `valor_calculado_total`.
    *   A lista de aprendizes, com seus respectivos cursos, e as informações globais de plano de pagamento e desconto, devem ser serializadas em um formato JSON e armazenada em um campo oculto (`detalhes_matricula`) para envio ao backend.

#### 4.5. RF.5 - Integração de Pagamento

*   **RF.5.1 - Envio de Dados do Formulário para Webhook de Submissão:**
    *   Após a validação da Etapa 2, todos os dados preenchidos no formulário (incluindo os campos ocultos `valor_calculado_total`, `detalhes_matricula` e `matricula`) devem ser enviados via POST para o webhook externo.
    *   O `payload` deve ser estruturado para acomodar múltiplos aprendizes e cursos, bem como o plano de pagamento e desconto globais.
*   **RF.5.2 - Recebimento de Link de Pagamento do Webhook:**
    *   O webhook de submissão deve retornar um objeto JSON contendo um campo `link` com a URL de pagamento.
*   **RF.5.3 - Redirecionamento para o Link de Pagamento:**
    *   Se o link for recebido com sucesso, o botão "Ir para o pagamento agora" deve ser ativado para redirecionar o usuário para essa URL em uma nova aba.
    *   Em caso de "Bolsista Integral" como forma de pagamento, a expectativa é que o webhook de submissão do formulário finalize a inscrição sem gerar um link de pagamento, registrando o aluno como bolsista. O frontend apenas envia a informação da forma de pagamento, e o backend é responsável por essa lógica.

#### 4.6. RF.6 - Pré-preenchimento de Campos (REVISADO)

*   **RF.6.1 - Preenchimento Automático via Webhook (Token de Matrícula):**
    *   O formulário deve ser capaz de detectar a presença de um parâmetro `matricula` na URL (ex: `https://formulariodoquintal.com/?matricula=003`).
    *   Se o parâmetro `matricula` for encontrado, o formulário deve realizar uma chamada `fetch` (ou `jQuery.ajax`) para um webhook específico no N8N (Endpoint: `https://criadordigital-n8n-webhook.kttqgl.easypanel.host/webhook/sua_webhook_de_consulta_dados_matricula`), passando o valor da `matricula` como parâmetro (ex: `GET /webhook/sua_webhook_de_consulta_dados_matricula?matricula=003`).
    *   O webhook do N8N será responsável por:
        *   Consultar uma fonte de dados (e.g., Google Sheets, banco de dados) utilizando a `matricula` como chave.
        *   Retornar um objeto JSON abrangente contendo todos os dados da matrícula prévia, incluindo:
            *   Informações completas do responsável.
            *   Um array de objetos, onde cada objeto representa um aprendiz, contendo suas informações pessoais, de saúde/emergência, e um array dos cursos previamente selecionados para ele (identificados pelo `nome` do curso/contraturno conforme `precos.json`).
            *   O plano de pagamento global (`planoPagamento`).
            *   A seleção de desconto global (`selecaoDesconto`).
            *   Forma de pagamento e dia de vencimento.
            *   Informações sobre como soube.
            *   Opcionalmente, o JSON de retorno pode incluir um código de cupom de rematrícula (`couponCode`) a ser automaticamente inserido e aplicado.
    *   O formulário deve então parsear a resposta JSON e usar os dados para **pré-preencher todos os campos correspondentes**, incluindo a criação dinâmica dos blocos para múltiplos aprendizes e a seleção de seus respectivos cursos.
    *   Em caso de falha na consulta ao webhook ou ausência do parâmetro `matricula`, o formulário deve iniciar vazio, como de praxe.

### 5. Requisitos Não Funcionais

#### 5.1. RNF.1 - Usabilidade (UX)
*   **RNF.1.1 - Interface Intuitiva:** Design limpo e fácil de navegar, com indicadores claros para adicionar/remover aprendizes e seus cursos. Para o pré-preenchimento, os campos preenchidos devem ser claramente visíveis e editáveis.
*   **RNF.1.2 - Feedback Claro:** Mensagens de erro e sucesso visíveis e compreensíveis, especialmente para validação de CPF e aplicação de cupom. Feedback visual claro se o pré-preenchimento foi bem-sucedido ou se houve um erro na consulta dos dados da matrícula.
*   **RNF.1.3 - Máscaras de Entrada:** Campos de telefone e CPF devem ter máscaras para facilitar o preenchimento e garantir o formato correto.
*   **RNF.1.4 - Rolagem para o Topo:** Após a transição entre etapas ou adição de novo bloco de aprendiz, a página deve rolar para o topo para garantir que o usuário veja o novo conteúdo.

#### 5.2. RNF.2 - Performance
*   **RNF.2.1 - Carregamento Rápido:** O formulário e seus recursos (JS, CSS, JSON) devem carregar rapidamente.
*   **RNF.2.2 - Resposta Rápida das Validações:** As validações locais (incluindo CPF) devem ser instantâneas para não impactar a fluidez da navegação. A consulta ao webhook de pré-preenchimento deve ter um tempo de resposta aceitável para não atrasar a exibição inicial do formulário.

#### 5.3. RNF.3 - Compatibilidade
*   **RNF.3.1 - Responsividade:** O formulário deve ser totalmente responsivo e funcionar bem em diferentes tamanhos de tela (desktop, tablet, mobile).
*   **RNF.3.2 - Compatibilidade com Navegadores:** Compatível com as versões mais recentes dos principais navegadores (Chrome, Firefox, Safari, Edge).

#### 5.4. RNF.4 - Segurança
*   **RNF.4.1 - Comunicação Segura:** Todas as chamadas para webhooks devem ser realizadas via HTTPS.
*   **RNF.4.2 - Não Armazenamento de Dados Sensíveis:** O frontend não deve armazenar permanentemente dados sensíveis dos usuários. O processamento e armazenamento devem ocorrer nos sistemas de backend integrados.
*   **RNF.4.3 - Token de Matrícula:** O token de matrícula na URL (`matricula=XXX`) deve ser um identificador opaco, sem informações sensíveis ou facilmente adivinháveis, que apenas o webhook do N8N consegue associar a dados de matrícula reais.

#### 5.5. RNF.5 - Manutenibilidade
*   **RNF.5.1 - Código Modular:** Estrutura de código HTML, CSS e JavaScript organizada para facilitar futuras manutenções e atualizações, com funções bem definidas para cada lógica (cálculo de preço, validação de CPF, manipulação de aprendizes, pré-preenchimento).
*   **RNF.5.2 - Dados de Preço e Cupons Externos:** O uso de arquivos JSON separados para dados de preço (`precos.json`) e cupons (`cupons.json`) permite atualizações sem a necessidade de modificar o código JavaScript principal.

### 6. Integrações

O formulário depende das seguintes integrações externas:

*   **Webhook de Submissão de Formulário:**
    *   **Endpoint:** `https://criadordigital-n8n-webhook.kttqgl.easypanel.host/webhook/c51bd45c-c232-44db-8490-f52f22ae34ce`
    *   **Método:** `POST`
    *   **Payload:** Objeto JSON contendo todos os dados do formulário, incluindo `valor_calculado_total`, `detalhes_matricula` (serializado como JSON), e `matricula`. A estrutura de `detalhes_matricula` deve ser capaz de representar a lista de aprendizes, cada um com seus cursos, e as informações globais de plano de pagamento e desconto.
    *   **Resposta Esperada:** `{ "link": "url_de_pagamento" }` (ou sinal de sucesso para bolsistas).

*   **Webhook de Pré-preenchimento de Dados (N8N):**
    *   **Endpoint:** `https://criadordigital-n8n-webhook.kttqgl.easypanel.host/webhook/sua_webhook_de_consulta_dados_matricula` (substituir por seu endpoint real)
    *   **Método:** `GET`
    *   **Parâmetro de Query:** `matricula={valor_da_matricula}`
    *   **Resposta Esperada (Exemplo de Estrutura JSON):**
        ```json
        {
          "success": true,
          "data": {
            "responsavel": {
              "nome": "André Silva",
              "cpf": "123.456.789-00",
              "telefone": "(11) 98765-4321",
              "email": "andre.silva@email.com",
              "endereco": "Rua das Flores, 123",
              "segundoResponsavelNome": "Ana Silva",
              "segundoResponsavelTelefone": "(11) 91234-5678"
            },
            "comoSoube": ["Instagram", "Amigos"],
            "planoPagamento": "Mensal",
            "selecaoDesconto": "Irmãos", // Nome do desconto, ex: "Irmãos"
            "formaPagamento": "PIX/Boleto",
            "diaVencimento": "Dia 10",
            "aprendizes": [
              {
                "id": "aprendiz1",
                "nome": "Pedro Silva",
                "escola": "Escola Modelo",
                "dataNascimento": "2018-05-10",
                "restricaoAlimentar": "Não",
                "questaoSaude": "Nenhuma",
                "emergenciaQuemChamar": "André Silva (11) 98765-4321",
                "cursos": ["desenho_segunda_manha", "ingles_sexta_tarde_14"] // Usar as chaves dos cursos/contraturnos do precos.json
              },
              {
                "id": "aprendiz2",
                "nome": "Maria Silva",
                "escola": "Escola Modelo",
                "dataNascimento": "2020-03-15",
                "restricaoAlimentar": "Amendoim",
                "questaoSaude": "Asma leve",
                "emergenciaQuemChamar": "André Silva (11) 98765-4321",
                "cursos": ["contraturno_tarde_1x", "artes_quarta_tarde"]
              }
            ],
            "couponCode": "REMATRICULA2025" // Opcional: para aplicar automaticamente um cupom
          }
        }
        ```

### 7. Considerações Técnicas/Assunções

*   **Tecnologias Frontend:** HTML5, CSS3, JavaScript.
*   **Bibliotecas:** jQuery (v3.6.0) e jQuery Mask (v1.14.16) para manipulação do DOM e máscaras de entrada.
*   **Estrutura de Dados de Preço:** Arquivo **`precos.json`** local com a estrutura definida para cursos (incluindo contraturnos), planos e descontos (conforme sua proposta).
*   **Estrutura de Dados de Cupons:** Arquivo `cupons.json` local com a estrutura definida para cupons (percentual/fixo, valor, mínimo de compra, expiração).
*   **Backend:** Assumimos que o webhook de **pré-preenchimento** (N8N) é capaz de consultar uma base de dados (e.g., Google Sheets, Airtable, etc.) utilizando o token de matrícula e retornar os dados no formato JSON especificado. O webhook de **submissão** (N8N) será responsável por processar os dados completos do formulário, incluindo o `matricula` para rastreabilidade e a deserialização dos detalhes de múltiplos aprendizes/cursos.
*   **Sistema de Pagamento:** O formulário não processa pagamentos diretamente; ele redireciona para um sistema de pagamento externo via um link fornecido pelo webhook.

---
