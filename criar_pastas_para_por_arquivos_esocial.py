import os
import shutil
import time

def ler_arquivo(path_arquivo):
    dados = {'cnpj': '', 'arquivos': []}
    with open(path_arquivo, 'r') as arquivo:
        linhas = arquivo.readlines()
        for linha in linhas:
            if linha.startswith('CNPJ da empresa :'):
                cnpj = linha.split(':')[1].strip()
                dados['cnpj'] = cnpj
            elif linha.startswith('Downloads bem-sucedidos:'):
                continue
            elif linha.strip().endswith('.zip'):
                dados['arquivos'].append(linha.strip())
    return dados

def criar_pasta_e_mover_arquivos(dados, pasta_destino, caminho_arquivo_log):
    cnpj = dados['cnpj']
    arquivos = dados['arquivos']
    
    # Cria a pasta de destino se não existir
    pasta_destino_cnpj = os.path.join(pasta_destino, cnpj)
    os.makedirs(pasta_destino_cnpj, exist_ok=True)
    
    # Tenta mover cada arquivo para a pasta de destino
    arquivos_nao_encontrados = []
    for arquivo in arquivos:
        origem = os.path.join(pasta_destino, arquivo)
        destino = os.path.join(pasta_destino_cnpj, arquivo)
        if os.path.exists(origem):
            try:
                shutil.move(origem, destino)
                print(f'Arquivo {arquivo} movido com sucesso para {pasta_destino_cnpj}')
            except Exception as e:
                print(f'Erro ao mover o arquivo {arquivo}: {e}')
        else:
            arquivos_nao_encontrados.append(arquivo)
            print(f'Arquivo {arquivo} não encontrado na pasta {pasta_destino}')
    
    # Tentativa de mover arquivos não encontrados novamente
    max_tentativas = 5
    tentativas = 0
    while arquivos_nao_encontrados and tentativas < max_tentativas:
        print(f'Tentando mover novamente os arquivos não encontrados, tentativa {tentativas + 1}')
        for arquivo in arquivos_nao_encontrados[:]:  # Iterar sobre uma cópia da lista
            origem = os.path.join(pasta_destino, arquivo)
            destino = os.path.join(pasta_destino_cnpj, arquivo)
            if os.path.exists(origem):
                try:
                    shutil.move(origem, destino)
                    print(f'Arquivo {arquivo} movido com sucesso para {pasta_destino_cnpj}')
                    arquivos_nao_encontrados.remove(arquivo)
                except Exception as e:
                    print(f'Erro ao mover o arquivo {arquivo}: {e}')
            else:
                print(f'Arquivo {arquivo} ainda não encontrado na pasta {pasta_destino}')
        tentativas += 1
        time.sleep(1)  # Espera 1 segundo antes da próxima tentativa
    
    if arquivos_nao_encontrados:
        print(f'Os seguintes arquivos não foram encontrados após {max_tentativas} tentativas: {arquivos_nao_encontrados}')
    
    # Move o arquivo de log para a pasta de destino
    try:
        shutil.move(caminho_arquivo_log, os.path.join(pasta_destino_cnpj, os.path.basename(caminho_arquivo_log)))
        print(f'Arquivo de log {caminho_arquivo_log} movido com sucesso para {pasta_destino_cnpj}')
    except OSError as e:
        print(f'Erro ao mover o arquivo de log {caminho_arquivo_log}: {e}')

def monitorar_pasta(caminho_arquivo_log, pasta_downloads, intervalo=1):
    print(f'Monitorando a pasta {pasta_downloads}...')
    while True:
        if os.path.exists(caminho_arquivo_log):
            print(f'Arquivo de log {caminho_arquivo_log} detectado.')
            # Lê os dados do novo arquivo de log
            dados_arquivo = ler_arquivo(caminho_arquivo_log)
            print(f'Dados do arquivo lido: {dados_arquivo}')
            
            # Cria a pasta com o CNPJ e move os arquivos
            criar_pasta_e_mover_arquivos(dados_arquivo, pasta_downloads, caminho_arquivo_log)
        
        time.sleep(intervalo)

if __name__ == "__main__":
    # Caminho para o arquivo .txt com os dados
    caminho_arquivo = 'C:\\Users\\alex.lopes\\Downloads\\log_downloads.txt'
    
    # Pasta onde os arquivos .zip estão localizados
    pasta_downloads = 'C:\\Users\\alex.lopes\\Downloads'
    
    # Monitorar a pasta com um intervalo de 1 segundo
    monitorar_pasta(caminho_arquivo, pasta_downloads, intervalo=1)
