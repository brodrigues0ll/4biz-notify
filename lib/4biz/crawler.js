import axios from "axios";

/**
 * Busca tickets usando a API REST do 4biz
 * @param {Object} options - Opções de configuração
 * @param {string} options.baseUrl - URL base da API
 * @param {string} options.sessionCookie - Cookie SESSION (opcional, usa .env se não fornecido)
 * @param {string} options.authToken - Token HYPER-AUTH-TOKEN (opcional, usa .env se não fornecido)
 * @param {number} options.itensPorPagina - Itens por página (padrão: 50)
 * @returns {Promise<Array>} Lista de tickets
 */
export async function fetchTicketsFromAPI({
  baseUrl = process.env.BASE_URL || "https://nav.4biz.one/4biz",
  sessionCookie = process.env.SESSION_COOKIE,
  authToken = process.env.AUTH_TOKEN,
  itensPorPagina = 50,
} = {}) {
  if (!sessionCookie || !authToken) {
    throw new Error(
      "Cookies de autenticação são obrigatórios. Configure SESSION_COOKIE e AUTH_TOKEN no .env ou passe como parâmetros.",
    );
  }

  const cookieString = `SESSION=${sessionCookie}; HYPER-AUTH-TOKEN=${authToken}`;

  const client = axios.create({
    baseURL: baseUrl,
    withCredentials: true,
    headers: {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control":
        "no-transform, no-store, no-cache, must-revalidate, post-check=0, pre-check=0",
      Connection: "keep-alive",
      "Content-Type": "application/json",
      DNT: "1",
      Origin: baseUrl.replace("/4biz", ""),
      Pragma: "no-cache",
      Referer: `${baseUrl}/pages/serviceRequestIncident/serviceRequestIncident.load?iframe=true`,
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
      "sec-ch-ua":
        '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      charset: "UTF-8",
      encoding: "UTF-8",
      Cookie: cookieString,
    },
  });

  async function buscarPagina(pagina) {
    try {
      const requestBody = {
        object: {
          paginaSelecionada: pagina,
          palavraChave: "",
          idSolicitacao: null,
          idTipo: -1,
          idContrato: -1,
          idGrupoAtual: -1,
          exibicao: "",
          tipoVisualizacao: "",
          exibicaoSubSolicitacoes: "N",
          situacaoSla: "",
          ordenarPor: "NSolicitacao",
          allowCommentOnly: false,
          itensPorPagina,
          idStatus: null,
          idStatusFluxo: null,
          totalRequests: 0,
          totalize: true,
        },
        realUrl: "/4biz/serviceRequestIncident/serviceRequestIncident.load",
      };

      const { data } = await client.post(
        "/rest/citajax/ticket/serviceRequestIncident/atualizarLista",
        requestBody,
      );

      return data;
    } catch (error) {
      console.error(`Erro ao buscar página ${pagina}:`, error.message);
      throw error;
    }
  }

  try {
    // Primeira requisição para descobrir total de páginas
    const primeiraResposta = await buscarPagina(1);

    if (!primeiraResposta || !primeiraResposta.requests) {
      throw new Error("Resposta da API inválida");
    }

    const totalTickets = primeiraResposta.totalRequests;
    const ultimaPagina = primeiraResposta.lastPage;

    console.log(`Total de tickets: ${totalTickets}, Páginas: ${ultimaPagina}`);

    let todosTickets = [...primeiraResposta.requests];

    // Buscar páginas restantes
    for (let pagina = 2; pagina <= ultimaPagina; pagina++) {
      const resposta = await buscarPagina(pagina);
      if (resposta && resposta.requests) {
        todosTickets = todosTickets.concat(resposta.requests);
      }
      // Pequeno delay entre requisições
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return todosTickets;
  } catch (error) {
    console.error("Erro ao buscar tickets via API:", error.message);
    throw error;
  }
}

/**
 * Mapeia códigos de situação para texto legível
 */
const SITUACAO_MAP = {
  1: "Em Andamento",
  2: "Suspensa",
  3: "Cancelada",
  4: "Resolvida",
  5: "Reaberta",
  6: "Fechada",
};

/**
 * Mapeia códigos de prioridade para texto legível
 */
const PRIORIDADE_MAP = {
  1: "Crítica",
  2: "Alta",
  3: "Média",
  4: "Baixa",
  5: "Baixa",
};

/**
 * Converte código de situação para texto
 * @param {number|string} situacaoCode - Código da situação
 * @returns {string} Texto da situação
 */
function converterSituacao(situacaoCode) {
  if (!situacaoCode) return "";
  const code = parseInt(situacaoCode);
  return SITUACAO_MAP[code] || `Situação ${code}`;
}

/**
 * Converte código de prioridade para texto
 * @param {number|string} prioridadeCode - Código da prioridade
 * @returns {string} Texto da prioridade
 */
function converterPrioridade(prioridadeCode) {
  if (!prioridadeCode) return "";
  const code = parseInt(prioridadeCode);
  return PRIORIDADE_MAP[code] || `Prioridade ${code}`;
}

/**
 * Organiza os dados do ticket da API para o formato usado pela aplicação
 * @param {Object} ticket - Ticket da API
 * @returns {Object} Ticket organizado
 */
export function organizarDadosTicket(ticket) {
  return {
    ticketId: ticket.id?.toString() || "",
    numero: ticket.id?.toString() || "",
    title: ticket.titulo || ticket.tipo || "",
    priority: converterPrioridade(ticket.prioridade), // Converte código para texto
    status: "", // Campo não utilizado - situacao é o campo correto
    dataCriacao: ticket.dataCriacao || "",
    responsavel: ticket.responsavel || "",
    solicitante: ticket.solicitante || "",
    sla: ticket.taskSlaTime || "",
    dataLimite: ticket.dataLimite || "",
    servico: ticket.nomeServico || "",
    descricao: ticket.descricao || "",
    // Dados adicionais da API
    tipo: ticket.tipo,
    situacao: converterSituacao(ticket.situacao), // Converte código para texto
    situacaoCodigo: ticket.situacao, // Mantém código original
    grupo: ticket.nomeGrupoAtual,
    idGrupo: ticket.idGrupoAtual,
    statusFluxo: {
      id: ticket.statusFluxoId,
      nome: ticket.statusFluxoNome,
      descricao: ticket.statusFluxoDescricao,
      corFundo: ticket.statusFluxoCorFundo,
      corTexto: ticket.statusFluxoCorTexto,
    },
    dadosCompletos: ticket, // Mantém os dados originais completos
  };
}

/**
 * Extrai cookies de sessão de uma string de cookies
 * @param {string} cookieString - String de cookies
 * @returns {Object} Objeto com sessionCookie e authToken
 */
export function extrairCookiesDeAutenticacao(cookieString) {
  const cookies = cookieString.split(";").reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split("=");
    acc[name] = value;
    return acc;
  }, {});

  return {
    sessionCookie: cookies.SESSION || process.env.SESSION_COOKIE,
    authToken: cookies["HYPER-AUTH-TOKEN"] || process.env.AUTH_TOKEN,
  };
}

/**
 * Busca tickets usando cookies do .env diretamente (sem Playwright)
 * Útil para sincronizações rápidas quando os cookies já estão configurados
 * @returns {Promise<Array>} Lista de tickets organizados
 */
export async function fetchTicketsFromEnv() {
  const tickets = await fetchTicketsFromAPI();
  return tickets.map(organizarDadosTicket);
}
