window.APP_CONFIG = {
  SUPABASE_URL: "https://iysvzrplixdajxmungwr.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_hqmf9YH25_Ccd-Oqgt2Qcg_QmCuMZGU"
};

// Correção para acesso em celular: o Supabase deve receber exatamente a URL base
// autorizada em Authentication > URL Configuration, sem variações de caminho ou barra final.
(function fixMagicLinkRedirect() {
  if (!window.supabase || !window.supabase.createClient) return;

  const originalCreateClient = window.supabase.createClient.bind(window.supabase);
  window.supabase.createClient = function createClientWithRedirectFix(...args) {
    const client = originalCreateClient(...args);
    const originalSignInWithOtp = client.auth.signInWithOtp.bind(client.auth);

    client.auth.signInWithOtp = function signInWithOtpFixed(params = {}) {
      const fixedParams = {
        ...params,
        options: {
          ...(params.options || {}),
          emailRedirectTo: window.location.origin,
          shouldCreateUser: true
        }
      };
      return originalSignInWithOtp(fixedParams);
    };

    return client;
  };
})();
