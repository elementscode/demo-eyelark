import { requireStaff } from "#app/shared/services/auth";
import { PatientRow, findPatients } from "#app/shared/services/patients";

/** @rpc */
export function searchPatients(query: string, filter: "all" | "recall"): PatientRow[] {
  requireStaff();

  return findPatients(query, filter);
}
