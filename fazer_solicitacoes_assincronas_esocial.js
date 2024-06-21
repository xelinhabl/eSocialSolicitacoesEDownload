let totalRequisicoesComErro = 0;
let totalRequisicoesBemSucedidas = 0;
let totalAtingido = 0;
const todasRequisicoes = [];

// Função para fazer a requisição Brasil API
const requisitarBrasilAPI = async (cnpjEmpresaEsocial) => {
    if (cnpjEmpresaEsocial.length <= 12) {
        console.log("Como é CPF usa data de abertura sempre 01/01/2018");
        return '01/01/2018';
    } else {
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
            return dataAbertura;
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
    return valor.replace(/\D/g, '');
};

const converterStringParaData = (dataString) => {
    const partes = dataString.split('/');
    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1; // Mês começa do 0 em JavaScript
    const ano = parseInt(partes[2], 10);
    return new Date(ano, mes, dia);
};

const formatarData = (data) => {
    if (!data || typeof data !== 'string') return null;
    const partes = data.split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

const verificaDataInicioAtividade = (dataFormatadaFinal) => {
    const data1 = converterStringParaData(dataFormatadaFinal);
    const data2 = converterStringParaData('01/01/2018');
    return data1 >= data2 ? dataFormatadaFinal : '01/01/2018';
};

const fazerRequisicaoPOST = async (dataInicio, dataFinal, atualizarProgresso) => {
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
        const response = await fetch('https://www.esocial.gov.br/portal/download/Pedido/Solicitacao', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados),
            redirect: 'manual'
        });

        console.log(response);

        if (response.status === 200) {
            const htmlContent = await response.text();
            const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
            const divElement = doc.querySelector('.fade-alert.alert.alert-danger.retornoServidor');
            const divElementSucess = doc.querySelector('.fade-alert.alert.alert-success.retornoServidor');

            if (divElement) {
                console.log('Conteúdo da div de erro:', divElement.textContent);
                if (divElement.textContent.includes("Pedido não foi aceito. Já existe um pedido do mesmo tipo.")) {
                    totalRequisicoesComErro++;
                } else if (divElement.textContent.includes("O limite de solicitações foi alcançado. Somente é permitido 100 solicitações por dia.")) {
                    totalAtingido++;
                } else {
                    totalRequisicoesBemSucedidas++;
                }
            } else if (divElementSucess && divElementSucess.textContent.includes("Solicitação enviada com sucesso.")) {
                console.log('Conteúdo da div de sucesso:', divElementSucess.textContent);
                totalRequisicoesBemSucedidas++;
            } else {
                console.log('Div não encontrada no HTML');
                totalRequisicoesBemSucedidas++;
            }

            todasRequisicoes.push({
                dataInicio: formatarDataParaString(dataInicio),
                dataFinal: formatarDataParaString(dataFinal),
                resposta: divElement ? divElement.textContent.trim() : (divElementSucess ? divElementSucess.textContent.trim() : '')
            });
        } else {
            if (response.status === 0 && response.url === 'https://www.esocial.gov.br/portal/download/Pedido/Solicitacao') {
                totalRequisicoesBemSucedidas++;
            } else {
                console.error('Erro na requisição original:', response.status);
                totalRequisicoesComErro++;
            }
            todasRequisicoes.push({
                dataInicio: formatarDataParaString(dataInicio),
                dataFinal: formatarDataParaString(dataFinal),
                resposta: 'Solicitação criada com sucesso!'
            });
        }

        totalRequisicoesProcessadas++;
        atualizarProgresso(totalRequisicoesProcessadas);
    } catch (error) {
        console.error('Erro ao fazer requisição:', error);
        totalRequisicoesComErro++;
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
        await loadFileSaver();

        let texto = '';

        for (let i = 0; i < todasRequisicoes.length; i++) {
            const requisicao = todasRequisicoes[i];
            texto += `Requisição ${i + 1}:\n`;
            texto += `Data Inicial: ${requisicao.dataInicio}\n`;
            texto += `Data Final: ${requisicao.dataFinal}\n`;
            texto += `Resposta: ${requisicao.resposta}\n\n`;
        }

        const blob = new Blob([texto], { type: 'text/plain' });
        saveAs(blob, 'log_empresa_solicitacao.txt');
    } catch (error) {
        console.error('Erro ao carregar FileSaver.js:', error);
    }
};

const criarDialogoData = async () => {
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

    document.body.removeChild(loadingMessage);

    if (formatarData(dataInicioAtividade)) {
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
    labelMesesBuscar.textContent = 'Intervalo de tempo em Meses: ';
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

    const quebraDeLinha10 = document.createElement('br');
    const quebraDeLinha11 = document.createElement('br');

    const labelMesesPular = document.createElement('label');
    labelMesesPular.textContent = 'Informe meses que NÃO deve ser solicitado, mais de um sepado por ";". Formato esperado MM/AAAA: ';
    const inputMesesPular = document.createElement('input');
    inputMesesPular.type = 'string';
    inputMesesPular.id = 'mesesPular';
    inputMesesPular.style.marginRight = '40px';

    const quebraDeLinha6 = document.createElement('br');

    botaoSolicitar.addEventListener('click', () => {
        const dataInicial = document.getElementById('dataInicialInput').value;
        const dataFinal = document.getElementById('dataFinalInput').value;
        const mesesBuscar = document.getElementById('mesesBuscarInput').value;
        const diasBuscar = document.getElementById('diasBuscarInput').value;
        const mesesPular = document.getElementById('mesesPular').value;
        const mesesPularArray = mesesPular.split(";");


        if (!dataInicial || !dataFinal) {
            alert('Por favor, informe ambas as datas.');
            return;
        }

        if (diasBuscar && (diasBuscar < 1 || diasBuscar > 31)) {
            console.log('Os dias para buscar deve estar entre 1 e 31');
            return;
        }

        document.body.removeChild(dialogo);

        const dataInicialFormatada = converterStringParaData(dataInicial);
        const dataFinalFormatada = converterStringParaData(dataFinal);

        const barraProgresso = criarBarraProgresso();

        if (diasBuscar && diasBuscar <= 31) {
            gerarRequisicoes(dataInicialFormatada, dataFinalFormatada, 0, dataCorteSolicitacao, mesesPularArray, barraProgresso, diasBuscar);
        } else {
            gerarRequisicoes(dataInicialFormatada, dataFinalFormatada, mesesBuscar, dataCorteSolicitacao, mesesPularArray, barraProgresso);
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
        linhaErro.textContent = 'Já existe um pedido do mesmo tipo. Total : ' + totalRequisicoesComErro;
        barraProgresso.appendChild(linhaErro);

        const linha100RequestAtingida = document.createElement('div');
        linha100RequestAtingida.textContent = 'Total de requisições dia atingido 100. Solicitações com erro :' + totalAtingido;
        barraProgresso.appendChild(linha100RequestAtingida);

        const atualizarProgresso = (percentual) => {
            progressBar.style.width = percentual + '%';
            progressoTexto.textContent = 'Progresso: ' + percentual + '%';
            linhaSucesso.textContent = 'Total de requisições bem-sucedidas: ' + totalRequisicoesBemSucedidas;
            linhaErro.textContent = 'Já existe um pedido do mesmo tipo, total :' + totalRequisicoesComErro;
            linha100RequestAtingida.textContent = 'Total de requisições por dia atingido 100 request. Solicitações com erro : ' + totalAtingido;
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
    dialogo.appendChild(quebraDeLinha11);
    dialogo.appendChild(labelMesesPular);
    dialogo.appendChild(inputMesesPular);
    dialogo.appendChild(quebraDeLinha10);
    dialogo.appendChild(botaoSolicitar);
    dialogo.appendChild(quebraDeLinha5);
    dialogo.appendChild(linhaInformativa);

    document.body.appendChild(dialogo);

    function tornarDialogoMovel(dialogo, dialogoHeader) {
        let posicaoInicialX, posicaoInicialY, posicaoFinalX, posicaoFinalY;
        let dragAtivo = false;

        dialogoHeader.addEventListener('mousedown', (e) => {
            dragAtivo = true;
            posicaoInicialX = e.clientX;
            posicaoInicialY = e.clientY;
        });

        document.addEventListener('mouseup', () => {
            dragAtivo = false;
        });

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

    tornarDialogoMovel(dialogo, dialogoHeader);

    if (dataFormatadaFinal) {
        inputDataInicial.value = dataFormatadaFinal;
        inputDataFinal.value = dataCorteSolicitacao;

        const verificarEnterPress = (event) => {
            if (event.key === 'Enter') {
                botaoSolicitar.click();
            }
        };
        document.addEventListener('keydown', verificarEnterPress);
    }
};

const gerarRequisicoes = async (dataInicial, dataFinal, mesesBuscar, dataCorte, mesesPular, atualizarProgresso, diasBuscar = 0) => {
    let dataInicio = new Date(dataInicial);
    let dataFim = new Date(dataFinal);

    if (dataFim > converterStringParaData(dataCorte)) {
        dataFim = converterStringParaData(dataCorte);
    }

    const intervaloDias = diasBuscar > 0 ? diasBuscar : 30 * mesesBuscar;
    let dataFinalRequisicao = new Date(dataInicio.getTime() + intervaloDias * 24 * 60 * 60 * 1000);
    const totalDias = Math.ceil((dataFim - dataInicio) / (1000 * 60 * 60 * 24));

    let percentual = 0;
    const totalRequisicoes = Math.ceil(totalDias / intervaloDias);
    let requestsConcluidas = 0;

    if (dataFinalRequisicao > dataFim) {
        dataFinalRequisicao = dataFim;
    }

    const promises = [];

    while (dataInicio < dataFim) {
        const { pularMes, dataFinalAjustada } = verificaPularMeses(mesesPular, dataInicio, dataFinalRequisicao);

        if (pularMes) {
            if (dataFinalAjustada) {
                dataFinalRequisicao = dataFinalAjustada;
                // Ajustar dataInicio para o próximo mês após o ajuste
                dataInicio = new Date(dataFinalRequisicao.getFullYear(), dataFinalRequisicao.getMonth() + 1, 1);
            } else {
                // Pular o intervalo inteiro
                dataInicio = new Date(dataFinalRequisicao.getTime() + (24 * 60 * 60 * 1000));
            }
        } else {
            promises.push(fazerRequisicaoPOST(dataInicio, dataFinalRequisicao, () => {
                requestsConcluidas++;
                percentual = Math.ceil((requestsConcluidas / totalRequisicoes) * 100);
                if (percentual > 100) {
                    percentual = 100;
                }
                atualizarProgresso(percentual);
            }));
            dataInicio = new Date(dataFinalRequisicao.getTime() + (24 * 60 * 60 * 1000));
        }

        // Recalcular dataFinalRequisicao para o próximo intervalo
        dataFinalRequisicao = new Date(dataInicio.getTime() + intervaloDias * 24 * 60 * 60 * 1000);
        if (dataFinalRequisicao > dataFim) {
            dataFinalRequisicao = dataFim;
        }
    }

    await Promise.all(promises);

    percentual = 100;
    atualizarProgresso(percentual);

    setTimeout(salvarRespostas, 10000);
};

const verificaPularMeses = (mesesPular, dataInicio, dataFim) => {
    for (let data of mesesPular) {
        let [mes, ano] = data.split("/").map(Number);
        let dataCompararInicio = new Date(ano, mes - 1, 1); // Primeiro dia do mês
        let dataCompararFim = new Date(ano, mes, 0); // Último dia do mês

        if (dataCompararInicio <= dataFim && dataCompararFim >= dataInicio) {
            // Data está dentro do intervalo de dataInicio e dataFim
            if (dataCompararInicio <= dataInicio && dataCompararFim >= dataFim) {
                return { pularMes: true };
            } else if (dataCompararInicio <= dataInicio && dataCompararFim <= dataFim) {
                let ultimoDiaMesInicio = new Date(dataInicio.getFullYear(), dataInicio.getMonth() + 1, 0);
                return { pularMes: true, dataFinalAjustada: ultimoDiaMesInicio };
            } else if (dataCompararInicio >= dataInicio && dataCompararInicio <= dataFim) {
                return { pularMes: true, dataFinalAjustada: dataCompararFim };
            }
        }
    }
    return { pularMes: false };
};

const dataDeCorteSolicitacoes = () => {
    const dataCorteSolicitacao = document.getElementsByClassName('alert alert-info')[0]?.innerText;
    const regex = /(\d{2}\/\d{2}\/\d{4})/;
    return dataCorteSolicitacao.match(regex)?.[0] || null;
};

// Chama DialogBox
criarDialogoData();