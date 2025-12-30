export async function scrapeTickets(page) {
  try {
    const tickets = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[name="list-item"]'));

      return items.map((item) => {
        const ticketId = item.getAttribute("data-request") || item.id.replace("list-item-", "");
        const numero = item.querySelector(".tableless-td.numero .request-id")?.textContent.trim() || ticketId;
        const title = item.querySelector(".tableless-td.solicitacao div")?.textContent.trim() || "";
        const priority = item.querySelector(".tableless-td.prioridade .badge")?.textContent.trim() || "";
        const status = item.querySelector(".tableless-td.situacao .badge")?.textContent.trim() || "";
        const dataCriacao = item.querySelector(".tableless-td.dataCriacao div")?.textContent.trim() || "";
        const responsavel = item.querySelector(".tableless-td.responsavel div")?.textContent.trim() || "";
        const solicitante = item.querySelector(".tableless-td.solicitante span")?.textContent.trim() || "";
        const sla = item.querySelector(".tableless-td.SLA div")?.textContent.trim() || "";
        const dataLimite = item.querySelector(".tableless-td.dataLimite div")?.textContent.trim() || "";
        const servico = item.querySelector(".tableless-td.servico div")?.textContent.trim() || "";
        const descricao = item.querySelector(".tableless-td.ellipsisDescricao div, .tableless-td.descricao div")?.textContent.trim() || "";

        return {
          ticketId,
          numero,
          title,
          priority,
          status,
          dataCriacao,
          responsavel,
          solicitante,
          sla,
          dataLimite,
          servico,
          descricao,
        };
      });
    });

    return tickets;
  } catch (error) {
    console.error("Erro ao extrair chamados:", error.message);
    return [];
  }
}
