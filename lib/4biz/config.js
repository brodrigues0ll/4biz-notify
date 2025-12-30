export const FOURBIZ_URLS = {
  HOME: "https://nav.4biz.one/",
  TICKETS: "https://nav.4biz.one/4biz/pages/serviceRequestIncident/serviceRequestIncident.load?iframe=true",
};

export const SELECTORS = {
  LOGIN_BUTTON: 'button.gsi-material-button, button:has-text("Entra ID Ziva"), button:has-text("entra id ziva"), a:has-text("Entra ID Ziva")',
  EMAIL_INPUT: 'input[type="email"], input[name="loginfmt"], input[name="username"], input[name="email"]',
  PASSWORD_INPUT: 'input[type="password"], input[name="passwd"], input[name="password"]',
  SUBMIT_BUTTON: 'input[type="submit"], button[type="submit"], button:has-text("Next"), button:has-text("Próximo"), button:has-text("Avançar"), #idSIButton9',
  SIGN_IN_BUTTON: 'input[type="submit"], button[type="submit"], button:has-text("Sign in"), button:has-text("Entrar"), button:has-text("Iniciar sessão"), #idSIButton9',
  STAY_SIGNED_IN: 'button:has-text("Sim"), button:has-text("Yes"), input[type="submit"], #idSIButton9',
  TICKET_ITEM: '[name="list-item"]',
};
