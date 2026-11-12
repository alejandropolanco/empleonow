import type { AuthUser } from "./api";
import { isOnboardingHandled } from "./onboarding";

/** Ruta inicial según el rol del usuario autenticado. */
export function homePathFor(user: AuthUser): string {
  if (user.role === "empresa") return "/company/desktop";
  if (user.role === "admin") return "/admin";
  return "/candidate/desktop";
}

/** Un postulante recién registrado debe completar su perfil antes de entrar. */
export function needsOnboarding(user: AuthUser): boolean {
  return (
    user.role === "postulante" &&
    !user.telefono &&
    !user.ubicacion &&
    !isOnboardingHandled()
  );
}

/** Destino al que debe ir un usuario ya autenticado al visitar una ruta pública. */
export function landingPathFor(user: AuthUser): string {
  return needsOnboarding(user) ? "/candidate/complete-profile" : homePathFor(user);
}
