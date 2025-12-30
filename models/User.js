import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Por favor, forneça um nome'],
  },
  email: {
    type: String,
    required: [true, 'Por favor, forneça um email'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Por favor, forneça uma senha'],
  },
  // Credenciais da 4Biz para login automático
  fourBizEmail: {
    type: String,
    default: '',
  },
  fourBizPassword: {
    type: String,
    default: '',
  },
  // Cookies de sessão salvos após login (cache)
  fourBizSessionCookies: {
    type: String,
    default: '',
  },
  fourBizSessionExpiry: {
    type: Date,
    default: null,
  },
  phoneToken: {
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String,
    },
  },
  // Configurações de sincronização automática
  autoSyncEnabled: {
    type: Boolean,
    default: false,
  },
  autoSyncIntervalMinutes: {
    type: Number,
    default: 5,
    min: 1,
  },
  lastAutoSync: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
