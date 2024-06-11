let totalRequisicoesComErro = 0;
let totalRequisicoesBemSucedidas = 0;
let totalAtingido = 0;
const todasRequisicoes = [];

// Função para fazer a requisição Brasil API
const requisitarBrasilAPI = async (cnpjEmpresaEsocial) => {

    if(cnpjEmpresaEsocial.length <= 12){
        // Se ocorrer um erro na requisição ou nenhum dado for retornado, continue sem interrupção
        console.log("Como é CPF usa data de abertura sempre 01/01/2018");
        return '01/01/2018';
    }else{
        try {
            const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjEmpresaEsocial}`);
            if (response.status === 200) {
                const data = await response.json();
                const dataInicioAtividade = data?.data_inicio_atividade;
                if (dataInicioAtividade) {
                    return formatarData(dataInicioAtividade);
                } else {
                    console.error('Data de início de atividade não encontrada na resposta da API:', data);
                    return null;
                }
            } else {
                console.error('Erro na requisição para a API BrasilAPI:', response.status);
                return requisitarSpeedioAPI(cnpjEmpresaEsocial);
            }
            
        } catch (error) {
            console.error('Erro ao requisitar Brasil API:', error);
            // Se ocorrer um erro na requisição ou nenhum dado for retornado, continue sem interrupção
            return '01/01/2018';
        }
    }
};

const requisitarSpeedioAPI = async (cnpjEmpresaEsocial) => {
    try {
        const response = await fetch(`https://api-publica.speedio.com.br/buscarcnpj?cnpj=${cnpjEmpresaEsocial}`);
        const data = await response.json();
        const dataAbertura = data?.['DATA ABERTURA'];

        if (dataAbertura) {
            return dataAbertura
        } else {
            console.error('Data de abertura não encontrada na resposta da segunda API:', data);
            return null;
        }
    } catch (error) {
        console.error('Erro ao requisitar segunda API:', error);
        return '01/01/2018';
    }
};

const formataCNPJ = () => {
    const nrCNPJ = document.getElementsByClassName('numero-inscricao');
    const valor = nrCNPJ[0].innerText;
    var valorFormatado = valor.replace(/\D/g, '');
    return valorFormatado;
};

const verificaDataInicioAtividade = (dataFormatadaFinal) => {
    const dataString1 = dataFormatadaFinal;
    const dataString2 = '01/01/2018';

    const converterStringParaData = (dataString) => {
        const partes = dataString.split('/');
        const dia = partes[0] === 'undefined' ? 1 : parseInt(partes[0], 10);
        const mes = partes[1] === 'undefined' ? 1 : parseInt(partes[1], 10) - 1;
        const ano = parseInt(partes[2], 10);
        return new Date(ano, mes, dia);
    };

    const formatarDataParaString = (data) => {
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        return `${dia}/${mes}/${ano}`;
    };

    const data1 = converterStringParaData(dataString1);
    const data2 = converterStringParaData(dataString2);

    if (data1 >= data2) {
        console.log(`${dataString1} é maior ou igual a ${dataString2}`);
        const dataFormatada = formatarDataParaString(data1);
        dataFormatadaFinal = dataFormatada;
    } else {
        const dataFormatada = formatarDataParaString(data2);
        dataFormatadaFinal = dataFormatada;
        console.log(`${dataString1} não é maior ou igual a ${dataString2}`);
    }
    return dataFormatadaFinal;
};

const formatarData = (data) => {
    if (!data || typeof data !== 'string') return null; // Verifica se a data está definida e é uma string

    // Divide a string da data em partes separadas por "-"
    const partes = data.split('-');
    
    // Extrai o ano, mês e dia das partes
    const ano = partes[0];
    const mes = partes[1];
    const dia = partes[2];

    // Retorna a data formatada no formato "DD/MM/AAAA"
    return `${dia}/${mes}/${ano}`;
};

const fazerRequisicaoPOST = async (dataInicio, dataFinal, atualizarProgresso) => {
    // Função para formatar a data no formato DD/MM/AAAA
    const formatarDataParaString = (data) => {
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        return `${dia}/${mes}/${ano}`;
    };

    const dados = {
        npjOperadorPortuario: "",
        CodigoLotacao: "",
        CodigoRubrica: "",
        CpfTrabalhador: "",
        DataFinal: formatarDataParaString(dataFinal),
        DataInicial: formatarDataParaString(dataInicio),
        HoraFinal: "23",
        HoraInicial: "00",
        IdTabelaRubrica: "",
        NumeroProcesso: "",
        PerApur: "",
        TipoPedido: "1",
        TipoProcesso: "0"
    };

    let totalRequisicoesProcessadas = 0;

    try {
        const originalRequest = fetch('https://www.esocial.gov.br/portal/download/Pedido/Solicitacao', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados),
            redirect: 'manual'
        });
        
        const responses = await Promise.all([originalRequest]);

        responses.forEach(async response => {
            console.log(response);

            if (response.status === 200) {
                console.log('Requisição original bem-sucedida:', response.status);
                // Ler o conteúdo HTML da resposta
                const htmlContent = await response.text();
                // Analisar o HTML para extrair informações
                const divElement = new DOMParser().parseFromString(htmlContent, 'text/html')
                    .querySelector('.fade-alert.alert.alert-danger.retornoServidor');
                const divElementSucess = new DOMParser().parseFromString(htmlContent, 'text/html').querySelector('.fade-alert.alert.alert-success.retornoServidor');
                if (divElement) {
                    console.log('Conteúdo da div de erro:', divElement.textContent);
                    // Verificar se o pedido foi aceito ou não com base no conteúdo da div
                    if (divElement.textContent.includes("Pedido não foi aceito. Já existe um pedido do mesmo tipo.")) {
                        totalRequisicoesComErro = totalRequisicoesComErro + 1 ;
                    } else if (divElement.textContent.includes("O limite de solicitações foi alcançado. Somente é permitido 100 solicitações por dia.")) {
                        totalAtingido = totalAtingido + 1;
                    } else {
                        // Incrementar o total de requisições bem-sucedidas
                        totalRequisicoesBemSucedidas = totalRequisicoesBemSucedidas + 1;
                    }   
                } else if (divElementSucess.textContent.includes("Solicitação enviada com sucesso.")) {
                            console.log('Conteúdo da div de sucesso:', divElementSucess.textContent);
                            // Incrementar o total de requisições bem-sucedidas
                            totalRequisicoesBemSucedidas = totalRequisicoesBemSucedidas + 1;
                } else {
                    console.log('Div não encontrada no HTML');
                    // Incrementar o total de requisições bem-sucedidas
                    totalRequisicoesBemSucedidas = totalRequisicoesBemSucedidas + 1;
                    
                }
                // Salvar os detalhes da requisição no array todasRequisicoes
                todasRequisicoes.push({
                    dataInicio: formatarDataParaString(dataInicio),
                    dataFinal: formatarDataParaString(dataFinal),
                    resposta: divElement ? divElement.textContent.trim() : (divElementSucess ? divElementSucess.textContent.trim() : '') // Remover espaços em branco extras
                });
            } else {
                if(response.status == 0 && response.url == 'https://www.esocial.gov.br/portal/download/Pedido/Solicitacao'){
                    // Incrementar o total de requisições bem-sucedidas
                    totalRequisicoesBemSucedidas = totalRequisicoesBemSucedidas + 1;
                }else{
                    console.error('Erro na requisição original:', response.status);
                    // Atualizar o total de requisições com erro
                    totalRequisicoesComErro = totalRequisicoesComErro + 1;
                }
                // Salvar os detalhes da requisição no array todasRequisicoes
                todasRequisicoes.push({
                    dataInicio: formatarDataParaString(dataInicio),
                    dataFinal: formatarDataParaString(dataFinal),
                    resposta: 'Solicitação criada com sucesso ! '
                });
            }
            // Incrementa o total de requisições processadas após o processamento de cada resposta
            totalRequisicoesProcessadas = totalRequisicoesProcessadas + 1;
            // Atualiza a barra de progresso após o loop completo
            atualizarProgresso(totalRequisicoesProcessadas);
        });
    } catch (error) {
        // Atualizar o total de requisições com erro
        console.error('Erro ao fazer requisição:', error);
        totalRequisicoesComErro = totalRequisicoesComErro + 1;
        // Atualiza a barra de progresso em caso de erro
        atualizarProgresso(totalRequisicoesProcessadas);
    }
};

// Função para carregar o FileSaver.js dinamicamente
const loadFileSaver = () => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
};

// Função para salvar os detalhes das requisições em um arquivo de texto
const salvarRespostas = async () => {
    try {
        // Carregar o FileSaver.js dinamicamente
        await loadFileSaver();

        let texto = '';

        for (let i = 0; i < todasRequisicoes.length; i++) {
            const requisicao = todasRequisicoes[i];
            texto += `Requisição ${i + 1}:\n`;
            texto += `Data Inicial: ${requisicao.dataInicio}\n`;
            texto += `Data Final: ${requisicao.dataFinal}\n`;
            texto += `Resposta: ${requisicao.resposta}\n\n`;
        }

        // Criar um Blob com o texto
        const blob = new Blob([texto], { type: 'text/plain' });

        // Salvar o Blob como um arquivo de texto
        saveAs(blob, 'log_empresa_solicitacao.txt');
    } catch (error) {
        console.error('Erro ao carregar FileSaver.js:', error);
    }
};


const verificarFormatoData = (data) => {
    // Expressão regular para o formato DD/MM/AAAA
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    // Verifica se a data corresponde ao padrão
    if (regex.test(data)) {
        return true; // Retorna verdadeiro se estiver no formato correto
    } else {
        return false; // Retorna falso se não estiver no formato correto
    }
};

const criarDialogoData = async () => {
    // Adiciona a mensagem de carregamento
    const loadingMessage = document.createElement('div');
    loadingMessage.textContent = 'Aguarde, buscando data de abertura da empresa...';
    loadingMessage.style.position = 'fixed';
    loadingMessage.style.top = '50%';
    loadingMessage.style.left = '50%';
    loadingMessage.style.transform = 'translate(-50%, -50%)';
    loadingMessage.style.background = '#fff';
    loadingMessage.style.padding = '35px';
    loadingMessage.style.border = '8px solid #ccc';
    loadingMessage.style.borderRadius = '32px';
    loadingMessage.style.boxShadow = '0 16px 24px rgba(0, 0, 0, 0.1)';
    loadingMessage.style.textAlign = 'center';
    
    document.body.appendChild(loadingMessage);

    const cnpjEmpresaEsocial = formataCNPJ();

    const dataInicioAtividade = await requisitarBrasilAPI(cnpjEmpresaEsocial);
    
    // Remove a mensagem de carregamento após a conclusão da requisição
    document.body.removeChild(loadingMessage);

    if (verificarFormatoData(dataInicioAtividade)) {
        console.log('A data está no formato correto (DD/MM/AAAA)');
    } else {
        console.log('A data não está no formato correto (DD/MM/AAAA)');
    }
    const dataCorteSolicitacao = dataDeCorteSolicitacoes();
    const dataFormatadaFinal = verificaDataInicioAtividade(dataInicioAtividade);

    const dialogo = document.createElement('div');
    dialogo.style.position = 'fixed';
    dialogo.style.top = '50%';
    dialogo.style.left = '50%';
    dialogo.style.transform = 'translate(-50%, -50%)';
    dialogo.style.background = '#fff';
    dialogo.style.padding = '35px';
    dialogo.style.border = '8px solid #ccc';
    dialogo.style.borderRadius = '32px';
    dialogo.style.boxShadow = '0 16px 24px rgba(0, 0, 0, 0.1)';
    dialogo.style.textAlign = 'center';

    // Cria o cabeçalho da dialogBox para movimentação
    const dialogoHeader = document.createElement('div');
    dialogoHeader.style.cursor = 'move';
    dialogoHeader.style.padding = '10px';
    dialogoHeader.style.backgroundColor = '#f1f1f1';
    dialogoHeader.style.borderBottom = '2px solid #ccc';
    dialogoHeader.style.borderTopLeftRadius = '25px';
    dialogoHeader.style.borderTopRightRadius = '25px';
    dialogo.appendChild(dialogoHeader);

    const botaoFechar = document.createElement('span');
    botaoFechar.textContent = 'X';
    botaoFechar.style.position = 'absolute';
    botaoFechar.style.top = '10px';
    botaoFechar.style.right = '10px';
    botaoFechar.style.cursor = 'pointer';
    botaoFechar.style.fontSize = '20px';
    botaoFechar.style.color = '#aaa';
    botaoFechar.style.fontWeight = 'bold';
    botaoFechar.addEventListener('click', () => {
        document.body.removeChild(dialogo);
    });
    dialogoHeader.appendChild(botaoFechar);

    const labelCabecalho = document.createElement('label');
    labelCabecalho.textContent = 'Insira o range para criar as Solicitações';
    labelCabecalho.style.display = 'block';
    labelCabecalho.style.fontWeight = 'bold';
    labelCabecalho.style.fontSize = '18px';

    const quebraDeLinha1 = document.createElement('br');

    const labelDataInicial = document.createElement('label');
    labelDataInicial.textContent = 'Data inicial (DD/MM/AAAA):         ';
    const inputDataInicial = document.createElement('input');
    inputDataInicial.type = 'text';
    inputDataInicial.id = 'dataInicialInput';
    inputDataInicial.style.marginRight = '40px';
    inputDataInicial.setAttribute('data-inputmask', "'alias': 'date'");
    inputDataInicial.setAttribute('placeholder', 'DD/MM/AAAA');
    $(inputDataInicial).inputmask({ alias: 'date' });

    const quebraDeLinha2 = document.createElement('br');
    const quebraDeLinha0 = document.createElement('br');
    const quebraDeLinha7 = document.createElement('br');
    const quebraDeLinha8 = document.createElement('br');

    const labelDataFinal = document.createElement('label');
    labelDataFinal.textContent = 'Data final (DD/MM/AAAA):         ';
    const inputDataFinal = document.createElement('input');
    inputDataFinal.type = 'text';
    inputDataFinal.id = 'dataFinalInput';
    inputDataFinal.style.marginRight = '40px';
    inputDataFinal.setAttribute('data-inputmask', "'alias': 'date'");
    inputDataFinal.setAttribute('placeholder', 'DD/MM/AAAA');
    $(inputDataFinal).inputmask({ alias: 'date' });

    const quebraDeLinha4 = document.createElement('br');

    const botaoSolicitar = document.createElement('button');
    botaoSolicitar.textContent = 'Solicitar';
    botaoSolicitar.style.cursor = 'pointer';
    botaoSolicitar.style.marginTop = '10px';
    botaoSolicitar.style.width = '100px';
    botaoSolicitar.style.height = '27px';
    botaoSolicitar.style.fontSize = '16px';
    botaoSolicitar.style.borderRadius = '100px';
    botaoSolicitar.style.background = '#007bff';
    botaoSolicitar.style.color = '#fff';

    const labelMesesBuscar = document.createElement('label');
    labelMesesBuscar.textContent = 'Meses a Buscar: ';
    const selectMesesBuscar = document.createElement('select');
    selectMesesBuscar.id = 'mesesBuscarInput';
    selectMesesBuscar.style.marginRight = '40px';

    for (let i = 1; i <= 6; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        selectMesesBuscar.appendChild(option);
    }

    const quebraDeLinha3 = document.createElement('br');

    const labelDiasBuscar = document.createElement('label');
    labelDiasBuscar.textContent = 'Dias a Buscar (min. 1 dia - max. 31 dias.): ';
    const inputDiasBuscar = document.createElement('input');
    inputDiasBuscar.type = 'number';
    inputDiasBuscar.id = 'diasBuscarInput';
    inputDiasBuscar.style.marginRight = '40px';
    inputDiasBuscar.min = '1';
    inputDiasBuscar.max = '31';

    const quebraDeLinha6 = document.createElement('br');

    botaoSolicitar.addEventListener('click', () => {
        const dataInicial = document.getElementById('dataInicialInput').value;
        const dataFinal = document.getElementById('dataFinalInput').value;
        const mesesBuscar = document.getElementById('mesesBuscarInput').value;
        const diasBuscar = document.getElementById('diasBuscarInput').value;
    
        if (!dataInicial || !dataFinal) {
            alert('Por favor, informe ambas as datas.');
            return;
        }
        
        if(diasBuscar == null || diasBuscar == undefined || diasBuscar == "" ){
            console.log("Vai continuar o processamento")
        }else{
            if(diasBuscar < 1 || diasBuscar > 31){
                console.log('Os dias para buscar deve estar entre 1 e 31')
            }
        }
    
        document.body.removeChild(dialogo);
    
        const dataInicialFormatada = converterStringParaData(dataInicial);
        const dataFinalFormatada = converterStringParaData(dataFinal);
    
        const barraProgresso = criarBarraProgresso();
    
        // Chame gerarRequisicoes com a data de corte como parâmetro
        if (diasBuscar && diasBuscar <= 31) {
            gerarRequisicoes(dataInicialFormatada, dataFinalFormatada, 0, dataCorteSolicitacao, barraProgresso, diasBuscar);
        } else {
            gerarRequisicoes(dataInicialFormatada, dataFinalFormatada, mesesBuscar, dataCorteSolicitacao, barraProgresso);
        }
    });

    const criarBarraProgresso = () => {
        const barraProgresso = document.createElement('div');
        barraProgresso.style.position = 'fixed';
        barraProgresso.style.top = '39%';
        barraProgresso.style.left = '50%';
        barraProgresso.style.transform = 'translate(-50%, -50%)';
        barraProgresso.style.background = '#fff';
        barraProgresso.style.padding = '25px';
        barraProgresso.style.border = '2px solid #000';
        barraProgresso.style.borderRadius = '25px';
        barraProgresso.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        barraProgresso.style.zIndex = '9999';
        barraProgresso.style.fontSize = '17px';
        
        // Cria o cabeçalho da barra de progresso para movimentação
        const barraProgressoHeader = document.createElement('div');
        barraProgressoHeader.style.cursor = 'move';
        barraProgressoHeader.style.padding = '10px';
        barraProgressoHeader.style.backgroundColor = '#f1f1f1';
        barraProgressoHeader.style.borderBottom = '2px solid #ccc';
        barraProgressoHeader.style.borderTopLeftRadius = '25px';
        barraProgressoHeader.style.borderTopRightRadius = '25px';
        barraProgresso.appendChild(barraProgressoHeader);
    
        const progressoTexto = document.createElement('span');
        progressoTexto.textContent = 'Progresso: 0%';
        progressoTexto.style.display = 'inherit';
        progressoTexto.style.marginBottom = '3px';
    
        const progressBar = document.createElement('div');
        progressBar.style.width = '0%';
        progressBar.style.height = '20px';
        progressBar.style.background = 'rgb(38 229 4 / 79%)';
        progressBar.style.borderRadius = '10px';
    
        const botaoFechar = document.createElement('button');
        botaoFechar.textContent = 'X';
        botaoFechar.style.position = 'absolute';
        botaoFechar.style.top = '5px';
        botaoFechar.style.right = '5px';
        botaoFechar.style.cursor = 'pointer';
        botaoFechar.style.fontSize = '14px';
        botaoFechar.style.border = 'none';
        botaoFechar.style.background = 'transparent';
        botaoFechar.style.color = '#aaa';
        botaoFechar.style.fontWeight = 'bold';
        botaoFechar.addEventListener('click', () => {
            document.body.removeChild(barraProgresso);
        });
    
        barraProgresso.appendChild(progressoTexto);
        barraProgresso.appendChild(progressBar);
        barraProgresso.appendChild(botaoFechar);

        document.body.appendChild(barraProgresso);

        const linhaSucesso = document.createElement('div');
        linhaSucesso.textContent = 'Total de requisições bem-sucedidas: ' + totalRequisicoesBemSucedidas;        
        barraProgresso.appendChild(linhaSucesso);
    
        const linhaErro = document.createElement('div');
        linhaErro.textContent = 'Já existe um pedido do mesmo tipo. Total : ' + totalRequisicoesComErro; // Adiciona o total de requisições com erro
        barraProgresso.appendChild(linhaErro);

        const linha72RequestAtingida = document.createElement('div');
        linha72RequestAtingida.textContent = 'Total de requisições dia atingido 72. Solicitações com erro :' + totalAtingido;
        barraProgresso.appendChild(linha72RequestAtingida);
    
        const atualizarProgresso = (percentual) => {
            progressBar.style.width = percentual + '%';
            progressoTexto.textContent = 'Progresso: ' + percentual + '%';
            // Atualiza requisições com erro 
            linhaSucesso.textContent = 'Total de requisições bem-sucedidas: ' + totalRequisicoesBemSucedidas;
            linhaErro.textContent = 'Já existe um pedido do mesmo tipo, total :' + totalRequisicoesComErro;
            linha72RequestAtingida.textContent = 'Total de requisições por dia atingido 72 request. Solicitações com erro : ' + totalAtingido;
        };
    
        tornarDialogoMovel(barraProgresso, barraProgressoHeader);
        return atualizarProgresso;
    };

    const linhaInformativa = document.createElement('label');
    linhaInformativa.textContent = 'As solicitações serão feitas do tipo TODOS OS EVENTOS ENTREGUES EM UM DETERMINADO PERÍODO';
    linhaInformativa.style.color = 'red';

    const quebraDeLinha5 = document.createElement('br');

    dialogo.appendChild(labelCabecalho);
    dialogo.appendChild(quebraDeLinha1);
    dialogo.appendChild(labelDataInicial);
    dialogo.appendChild(inputDataInicial);
    dialogo.appendChild(quebraDeLinha2);
    dialogo.appendChild(quebraDeLinha0);
    dialogo.appendChild(labelDataFinal);
    dialogo.appendChild(inputDataFinal);
    dialogo.appendChild(quebraDeLinha4);
    dialogo.appendChild(quebraDeLinha8);
    dialogo.appendChild(labelMesesBuscar);
    dialogo.appendChild(selectMesesBuscar);
    dialogo.appendChild(quebraDeLinha3);
    dialogo.appendChild(quebraDeLinha7);
    dialogo.appendChild(labelDiasBuscar);
    dialogo.appendChild(inputDiasBuscar);
    dialogo.appendChild(quebraDeLinha6);
    dialogo.appendChild(botaoSolicitar);
    dialogo.appendChild(quebraDeLinha5);
    dialogo.appendChild(linhaInformativa);

    document.body.appendChild(dialogo);

    // Função para tornar um elemento móvel ao clicar e arrastar o cabeçalho
    function tornarDialogoMovel(dialogo, dialogoHeader) {
        let posicaoInicialX, posicaoInicialY, posicaoFinalX, posicaoFinalY;
        let dragAtivo = false;

        // Adiciona evento de mouse pressionado no cabeçalho
        dialogoHeader.addEventListener('mousedown', (e) => {
            dragAtivo = true;
            posicaoInicialX = e.clientX;
            posicaoInicialY = e.clientY;
        });

        // Adiciona evento de mouse solto
        document.addEventListener('mouseup', () => {
            dragAtivo = false;
        });

        // Adiciona evento de mouse movendo
        document.addEventListener('mousemove', (e) => {
            if (dragAtivo) {
                e.preventDefault();
                posicaoFinalX = posicaoInicialX - e.clientX;
                posicaoFinalY = posicaoInicialY - e.clientY;
                posicaoInicialX = e.clientX;
                posicaoInicialY = e.clientY;
                dialogo.style.top = (dialogo.offsetTop - posicaoFinalY) + 'px';
                dialogo.style.left = (dialogo.offsetLeft - posicaoFinalX) + 'px';
            }
        });
    }

    // Chama a função para tornar a dialogBox móvel
    tornarDialogoMovel(dialogo, dialogoHeader);

    if (dataFormatadaFinal) {
        inputDataInicial.value = dataFormatadaFinal;
        inputDataFinal.value = dataCorteSolicitacao;

        // Se os campos já estiverem preenchidos, permita pressionar Enter
        const verificarEnterPress = (event) => {
            if (event.key === 'Enter') {
                botaoSolicitar.click();
            }
        };
        document.addEventListener('keydown', verificarEnterPress);
    }

    // Chama a função para começar a verificar
    verificarBotaoRenovarSessao();

    // Adiciona eventos de teclado para executar o botão ao pressionar Enter
    const executarAoPressionarEnter = (event) => {
        if (event.key === 'Enter') {
            botaoSolicitar.click();
        }
    };

    inputDataInicial.addEventListener('keydown', executarAoPressionarEnter);
    inputDataFinal.addEventListener('keydown', executarAoPressionarEnter);
    inputDiasBuscar.addEventListener('keydown', executarAoPressionarEnter);
};

const gerarRequisicoes = async (dataInicial, dataFinal, mesesBuscar, dataCorte, atualizarProgresso, diasBuscar = 0) => {
    let dataInicio = new Date(dataInicial);
    let dataFim = new Date(dataFinal);
    
    // Verifica se a data de final é maior que a data de corte
    if (dataFim > dataCorte) {
        dataFim = dataCorte;
    }

    const intervaloDias = diasBuscar > 0 ? diasBuscar : 30 * mesesBuscar;
    let dataFinalRequisicao = new Date(dataInicio.getTime() + intervaloDias * 24 * 60 * 60 * 1000);
    const totalDias = Math.ceil((dataFim - dataInicio) / (1000 * 60 * 60 * 24));

    let percentual = 0;

    // Ajuste para garantir que o número total de requisições seja arredondado para cima
    const totalRequisicoes = Math.ceil(totalDias / intervaloDias);

    let requestsConcluidas = 0;

    // Garante que a data fim não vai ser ultrapassada
    if (dataFinalRequisicao > dataFim){
        dataFinalRequisicao = dataFim;
    }

    const promises = [];

    while (dataInicio < dataFim) {
        promises.push(fazerRequisicaoPOST(dataInicio, dataFinalRequisicao, () => {
            requestsConcluidas++;
            percentual = Math.ceil((requestsConcluidas / totalRequisicoes) * 100);
            // Limita o percentual a 100%
            if (percentual > 100) {
                percentual = 100;
            }
            atualizarProgresso(percentual);
        }));
        dataInicio = new Date(dataFinalRequisicao.getTime() + (24 * 60 * 60 * 1000));
        dataFinalRequisicao = new Date(dataInicio.getTime() + intervaloDias * 24 * 60 * 60 * 1000);
        if (dataFinalRequisicao > dataFim) {
            dataFinalRequisicao = dataFim;
        }
    }

    await Promise.all(promises);

    // Corrige o percentual para 100% ao finalizar todas as requisições
    percentual = 100;
    atualizarProgresso(percentual);
    
    // Espera 10 segundos antes de chamar a função salvarRespostas()
    setTimeout(() => {
        salvarRespostas();
    }, 10000); // 10000 milissegundos = 10 segundos
    
};


const converterStringParaData = (dataString) => {
    // Divide a string da data em dia, mês e ano
    const partes = dataString.split('/');
    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10);
    const ano = parseInt(partes[2], 10);

    // Cria uma nova string no formato "AAAA-MM-DD"
    const dataFormatada = `${ano}-${mes}-${dia}`;

    // Retorna o objeto Date criado a partir da nova string formatada
    return new Date(dataFormatada);
};

const dataDeCorteSolicitacoes = () => {
    const dataCorteSolicitacao = document.getElementsByClassName('alert alert-info');
    const dataCorte = dataCorteSolicitacao[0].innerText;
    const regex = /(\d{2}\/\d{2}\/\d{4})/;
    const matches = dataCorte.match(regex);
    if (matches && matches.length > 0) {
        return matches[0];
    } else {
        return null;
    }
};

function verificarBotaoRenovarSessao() {
    // Obtém o elemento do temporizador da sessão
    const temporizadorSessao = document.querySelector('.tempo-sessao.countdown');

    if (temporizadorSessao) {
        // Extrai os minutos e segundos do temporizador
        const tempoRestante = temporizadorSessao.textContent.trim().split(':');
        const minutos = parseInt(parseInt(tempoRestante[0]), 10);
        const segundos = parseInt(parseInt(tempoRestante[1]) + 10 , 10); // adiciona 10 segundos pois 

        console.log('Sessão será renovada automaticamente daqui : ' + minutos + 'min ' + segundos + 'seg. ');

        // Calcula o tempo total em segundos
        const tempoTotalSegundos = minutos * 60 + segundos;

        // Define o intervalo de verificação com base no tempo restante na sessão
        const interval = setInterval(() => {
            const botaoRenovarSessao = document.getElementById('btnRenovarSessao');
            if (botaoRenovarSessao) {
                // Se o botão for encontrado, clique nele
                botaoRenovarSessao.click();
                clearInterval(interval); // Para de verificar após clicar no botão
            }
        }, tempoTotalSegundos * 1000); // Verifica após o tempo total em segundos
    }
}

// Chama DialogBox
criarDialogoData();