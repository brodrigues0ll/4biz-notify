#!/usr/bin/env node

/**
 * Script para sincronizar tickets usando apenas os cookies do .env
 * Não precisa do Playwright - muito mais rápido!
 *
 * Uso: node scripts/sync-tickets-env.js
 */

import dotenv from "dotenv";
import { fetchTicketsFromEnv } from "../lib/4biz/index.js";

dotenv.config({ path: ".env.local" });

async function syncTickets() {
  console.log("\n🚀 Sincronização Rápida de Tickets (via .env)\n");
  console.log("=".repeat(60));

  try {
    // Verificar se os cookies estão configurados
    if (!process.env.SESSION_COOKIE || !process.env.AUTH_TOKEN) {
      console.error("\n❌ Erro: Cookies não configurados no .env.local");
      console.log("\nConfigure as seguintes variáveis:");
      console.log("  SESSION_COOKIE=seu_cookie_session");
      console.log("  AUTH_TOKEN=seu_token_hyper_auth");
      console.log("\n💡 Obtenha os cookies na aba Network do DevTools");
      process.exit(1);
    }

    console.log("✅ Cookies encontrados no .env");
    console.log(`📋 SESSION: ${process.env.SESSION_COOKIE.substring(0, 20)}...`);
    console.log(`🔑 AUTH_TOKEN: ${process.env.AUTH_TOKEN.substring(0, 50)}...`);
    console.log("\n" + "=".repeat(60));

    console.log("\n🔍 Buscando tickets...");
    const startTime = Date.now();

    const tickets = await fetchTicketsFromEnv();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n" + "=".repeat(60));
    console.log("✅ SINCRONIZAÇÃO CONCLUÍDA");
    console.log("=".repeat(60));
    console.log(`⏱️  Tempo: ${duration}s`);
    console.log(`📊 Total de tickets: ${tickets.length}`);

    // Estatísticas
    const stats = {
      porTipo: {},
      porStatus: {},
      porPrioridade: {},
    };

    tickets.forEach((ticket) => {
      stats.porTipo[ticket.tipo] = (stats.porTipo[ticket.tipo] || 0) + 1;
      stats.porStatus[ticket.status] = (stats.porStatus[ticket.status] || 0) + 1;
      stats.porPrioridade[ticket.priority] =
        (stats.porPrioridade[ticket.priority] || 0) + 1;
    });

    console.log("\n📊 Por Tipo:");
    Object.entries(stats.porTipo)
      .sort((a, b) => b[1] - a[1])
      .forEach(([tipo, count]) => {
        console.log(`   ${tipo}: ${count}`);
      });

    console.log("\n📊 Por Status:");
    Object.entries(stats.porStatus)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });

    console.log("\n📊 Por Prioridade:");
    Object.entries(stats.porPrioridade)
      .sort((a, b) => b[1] - a[1])
      .forEach(([prioridade, count]) => {
        console.log(`   ${prioridade}: ${count}`);
      });

    // Mostrar alguns tickets de exemplo
    console.log("\n📋 Exemplos de Tickets:");
    tickets.slice(0, 3).forEach((ticket, index) => {
      console.log(`\n${index + 1}. Ticket #${ticket.numero}`);
      console.log(`   Tipo: ${ticket.tipo}`);
      console.log(`   Título: ${ticket.title}`);
      console.log(`   Status: ${ticket.status}`);
      console.log(`   Prioridade: ${ticket.priority}`);
      console.log(`   Responsável: ${ticket.responsavel}`);
    });

    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("\n❌ ERRO:", error.message);

    if (error.message.includes("401") || error.message.includes("403")) {
      console.log("\n💡 Dicas:");
      console.log("   1. Os cookies podem ter expirado");
      console.log("   2. Atualize SESSION_COOKIE e AUTH_TOKEN no .env.local");
      console.log("   3. Copie os novos valores da aba Network do DevTools");
    }

    process.exit(1);
  }
}

syncTickets();
