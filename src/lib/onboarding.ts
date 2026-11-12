const KEY = "en_onboarding_handled";

/** Marca que el usuario ya vio (guardó u omitió) la pantalla de completar perfil. */
export function markOnboardingHandled() {
  localStorage.setItem(KEY, "1");
}

export function isOnboardingHandled(): boolean {
  return localStorage.getItem(KEY) === "1";
}

export function clearOnboardingHandled() {
  localStorage.removeItem(KEY);
}
