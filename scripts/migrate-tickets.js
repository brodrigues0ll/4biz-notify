#!/usr/bin/env node

/**
 * Script para migrar tickets existentes no banco
 * Adiciona campos novos que vieram com a API (situacao, tipo, grupo, etc)
 *
 * Uso: node scripts/migrate-tickets.js
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import Ticket from "../models/Ticket.js";

dotenv.config({ path: ".env.local" });

async function migrateTickets() {
  console.log("\n🔄 Migração de Tickets\n");
  console.log("=".repeat(60));

  try {
    // Conectar ao MongoDB
    console.log("📡 Conectando ao MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Conectado ao MongoDB\n");

    // Buscar todos os tickets que não têm os novos campos
    const ticketsToMigrate = await Ticket.find({
      $or: [
        { situacao: { $exists: false } },
        { tipo: { $exists: false } },
        { grupo: { $exists: false } },
        { numero: { $exists: false } },
        { descricao: { $exists: false } },
        { dataCriacao: { $exists: false } },
      ],
    });

    console.log(`📊 Tickets a migrar: ${ticketsToMigrate.length}`);

    if (ticketsToMigrate.length === 0) {
      console.log("✅ Todos os tickets já estão atualizados!\n");
      process.exit(0);
    }

    console.log("\n🔧 Atualizando tickets...\n");

    let updated = 0;
    for (const ticket of ticketsToMigrate) {
      // Adicionar campos padrão vazios se não existirem
      const updates = {};

      if (!ticket.situacao) updates.situacao = "";
      if (!ticket.tipo) updates.tipo = "";
      if (!ticket.grupo) updates.grupo = "";
      if (!ticket.idGrupo) updates.idGrupo = null;
      if (!ticket.numero) updates.numero = ticket.ticketId?.toString() || "";
      if (!ticket.descricao) updates.descricao = "";
      if (!ticket.dataCriacao) updates.dataCriacao = "";
      if (!ticket.statusFluxo) updates.statusFluxo = {};

      if (Object.keys(updates).length > 0) {
        await Ticket.findByIdAndUpdate(ticket._id, updates);
        updated++;
        console.log(`   ✅ Ticket #${ticket.ticketId} atualizado`);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ MIGRAÇÃO CONCLUÍDA");
    console.log("=".repeat(60));
    console.log(`📊 Tickets atualizados: ${updated}`);
    console.log("\n💡 Dica: Faça uma sincronização para preencher os novos campos\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERRO:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrateTickets();
