import mongoose from "mongoose";

const TicketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  ticketId: {
    type: Number,
    required: [true, "ID do chamado é obrigatório"],
  },
  title: {
    type: String,
    required: [true, "Título é obrigatório"],
  },
  status: {
    type: String,
  },
  priority: {
    type: String,
    required: [true, "Prioridade é obrigatória"],
  },
  situacao: {
    type: String,
    default: "",
  },
  situacaoCodigo: {
    type: Number,
    default: null,
  },
  tipo: {
    type: String,
    default: "",
  },
  grupo: {
    type: String,
    default: "",
  },
  idGrupo: {
    type: Number,
    default: null,
  },
  sla: {
    type: String,
    default: "",
  },
  solicitante: {
    type: String,
    default: "",
  },
  responsavel: {
    type: String,
    default: "",
  },
  servico: {
    type: String,
    default: "",
  },
  dataLimite: {
    type: String,
    default: "",
  },
  dataCriacao: {
    type: String,
    default: "",
  },
  descricao: {
    type: String,
    default: "",
  },
  numero: {
    type: String,
    default: "",
  },
  statusFluxo: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  raw: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Criar índice composto para evitar duplicação de tickets por usuário
TicketSchema.index({ userId: 1, ticketId: 1 }, { unique: true });

export default mongoose.models.Ticket || mongoose.model("Ticket", TicketSchema);
