/**
 * DataSUS Type Definitions
 * Interfaces for Brazilian Health System integration
 * 
 * References:
 * - e-SUS AB: https://sisaps.saude.gov.br/esus/
 * - SISREG: https://sisregiii.saude.gov.br/
 * - CADSUS: Cadastro Nacional de Usuários do SUS
 */

// ==========================================
// CADSUS - Cadastro Nacional de Usuários
// ==========================================

export interface CADSUSPatient {
    /** Número do Cartão SUS (CNS) - 15 dígitos */
    cns: string
    /** CPF do paciente */
    cpf: string
    /** Nome completo */
    nome: string
    /** Nome social (se aplicável) */
    nomeSocial?: string
    /** Data de nascimento (YYYY-MM-DD) */
    dataNascimento: string
    /** Sexo: M, F */
    sexo: 'M' | 'F'
    /** Nome da mãe */
    nomeMae: string
    /** Nome do pai */
    nomePai?: string
    /** Código IBGE do município de nascimento */
    codigoMunicipioNascimento: string
    /** Nacionalidade */
    nacionalidade: 'B' | 'E' | 'N' // Brasileiro, Estrangeiro, Naturalizado
    /** Raça/Cor */
    racaCor: '01' | '02' | '03' | '04' | '05' // Branca, Preta, Parda, Amarela, Indígena
    /** Etnia (se indígena) */
    etnia?: string
    /** Endereço completo */
    endereco: CADSUSEndereco
    /** Telefones */
    telefones: string[]
    /** Email */
    email?: string
}

export interface CADSUSEndereco {
    cep: string
    logradouro: string
    numero: string
    complemento?: string
    bairro: string
    codigoMunicipio: string // Código IBGE
    uf: string
}

// ==========================================
// e-SUS AB - Atenção Básica
// ==========================================

export interface ESUSFichaAtendimentoIndividual {
    /** UUID da ficha */
    uuidFicha: string
    /** Profissional responsável */
    profissional: ESUSProfissional
    /** Local de atendimento */
    localAtendimento: ESUSLocalAtendimento
    /** Data/hora do atendimento */
    dataHoraAtendimento: string
    /** Paciente atendido */
    paciente: ESUSPacienteResumo
    /** Tipo de atendimento */
    tipoAtendimento:
    | 'CONSULTA_AGENDADA'
    | 'ESCUTA_INICIAL'
    | 'CONSULTA_DEMANDA_ESPONTANEA'
    | 'ATENDIMENTO_URGENCIA'
    /** CIAP-2 principal */
    ciapPrincipal?: string
    /** CID-10 principal */
    cidPrincipal?: string
    /** Lista de CIAP-2 secundários */
    ciapsSecundarios?: string[]
    /** Lista de CID-10 secundários */
    cidsSecundarios?: string[]
    /** Procedimentos realizados (códigos SIGTAP) */
    procedimentos?: string[]
    /** Conduta/desfecho */
    conduta: ESUSConduta
    /** Encaminhamentos */
    encaminhamentos?: ESUSEncaminhamento[]
}

export interface ESUSProfissional {
    cns: string
    cbo: string // Código Brasileiro de Ocupações
    nome: string
    ine: string // Identificador Nacional de Equipe
}

export interface ESUSLocalAtendimento {
    cnes: string // Cadastro Nacional de Estabelecimentos de Saúde
    ine?: string
    nome: string
}

export interface ESUSPacienteResumo {
    cns: string
    cpf?: string
    nome: string
    dataNascimento: string
    sexo: 'M' | 'F'
}

export interface ESUSConduta {
    /** Retorno para consulta agendada */
    retornoConsulta?: boolean
    /** Alta do episódio */
    altaEpisodio?: boolean
    /** Encaminhamento interno */
    encaminhamentoInterno?: boolean
    /** Encaminhamento externo */
    encaminhamentoExterno?: boolean
}

export interface ESUSEncaminhamento {
    tipo: 'INTERNO' | 'ESPECIALIDADE' | 'URGENCIA' | 'INTERNACAO'
    especialidade?: string
    observacao?: string
}

// ==========================================
// SISREG - Sistema de Regulação
// ==========================================

export interface SISREGSolicitacao {
    /** Número da solicitação */
    numeroSolicitacao: string
    /** Data da solicitação */
    dataSolicitacao: string
    /** Prioridade */
    prioridade: 'VERDE' | 'AMARELA' | 'VERMELHA'
    /** Paciente */
    paciente: SISREGPaciente
    /** Unidade solicitante */
    unidadeSolicitante: SISREGUnidade
    /** Procedimento solicitado (código SIGTAP) */
    procedimento: string
    /** CID-10 da indicação */
    cid10: string
    /** Justificativa clínica */
    justificativa: string
    /** Status atual */
    status: SISREGStatus
    /** Profissional solicitante */
    profissionalSolicitante: SISREGProfissional
}

export interface SISREGPaciente {
    cns: string
    cpf: string
    nome: string
    dataNascimento: string
    telefone: string
}

export interface SISREGUnidade {
    cnes: string
    nome: string
    municipio: string
}

export interface SISREGProfissional {
    cns: string
    nome: string
    crm?: string
}

export type SISREGStatus =
    | 'PENDENTE'
    | 'EM_ANALISE'
    | 'AGENDADA'
    | 'NEGADA'
    | 'EXECUTADA'
    | 'CANCELADA'
    | 'NAO_COMPARECEU'

// ==========================================
// SIGTAP - Procedimentos
// ==========================================

export interface SIGTAPProcedimento {
    /** Código do procedimento (10 dígitos) */
    codigo: string
    /** Nome do procedimento */
    nome: string
    /** Grupo */
    grupo: string
    /** Subgrupo */
    subgrupo: string
    /** Forma de organização */
    formaOrganizacao: string
    /** Valor ambulatorial */
    valorAmbulatorial: number
    /** Valor hospitalar */
    valorHospitalar: number
    /** CBO permitidos */
    cbosPermitidos: string[]
    /** Idade mínima */
    idadeMinima?: number
    /** Idade máxima */
    idadeMaxima?: number
    /** Sexo permitido */
    sexoPermitido?: 'M' | 'F' | 'A' // A = Ambos
}

// ==========================================
// Response Types
// ==========================================

export interface DataSUSResponse<T> {
    success: boolean
    data?: T
    error?: {
        code: string
        message: string
        details?: string
    }
    timestamp: string
}

export interface DataSUSPaginatedResponse<T> extends DataSUSResponse<T[]> {
    pagination: {
        page: number
        pageSize: number
        total: number
        totalPages: number
    }
}
