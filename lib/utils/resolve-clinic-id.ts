/**
 * resolve-clinic-id.ts
 * 
 * Helper para resolver o clinic_id correto em APIs server-side.
 * Suporta impersonação: quando um SUPER_ADMIN está impersonando uma clínica,
 * o cookie `impersonation_clinic_id` contém o ID da clínica-alvo.
 * 
 * Prioridade de resolução:
 * 1. profile.clinic_id (usuários normais com clínica associada)
 * 2. Cookie `impersonation_clinic_id` (SUPER_ADMIN impersonando)
 * 3. null (falha — sem clínica resolvível)
 */
import { cookies } from 'next/headers';

interface ResolveClinicIdParams {
  profileClinicId: string | null | undefined;
  profileRole: string;
}

interface ResolveClinicIdResult {
  clinicId: string | null;
  isImpersonating: boolean;
}

export async function resolveClinicId({
  profileClinicId,
  profileRole,
}: ResolveClinicIdParams): Promise<ResolveClinicIdResult> {
  // 1. Usuário normal com clínica associada
  if (profileClinicId) {
    return { clinicId: profileClinicId, isImpersonating: false };
  }

  // 2. SUPER_ADMIN sem clinic_id — tentar impersonação via cookie
  if (profileRole === 'SUPER_ADMIN') {
    try {
      const cookieStore = await cookies();
      const impersonationClinicId = cookieStore.get('impersonation_clinic_id')?.value;
      if (impersonationClinicId) {
        return { clinicId: impersonationClinicId, isImpersonating: true };
      }
    } catch {
      // cookies() pode falhar em contextos edge — silenciar
    }
  }

  // 3. Sem clínica resolvível
  return { clinicId: null, isImpersonating: false };
}
