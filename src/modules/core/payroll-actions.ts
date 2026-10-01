"use server";

import type { ActionResult } from "@/types/shared";
import { objectFromForm } from "@/lib/formdata";
import { periodeBulanIni } from "@/lib/utils";
import { generateMonthlyPayroll, importSettlement } from "@/modules/core/payroll";

/**
 * Form wrapper untuk ServerForm (useActionState).
 * Dipisah dari payroll.ts karena file itu juga meng-export helper
 * non-action (buildPayrollCsv, tipe data) yang tidak boleh berada
 * di dalam modul "use server".
 */
export async function generateMonthlyPayrollForm(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult | null> {
  const o = objectFromForm(fd);
  return generateMonthlyPayroll(String(o.periodeBulan ?? periodeBulanIni()));
}

export async function importSettlementForm(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult | null> {
  const o = objectFromForm(fd);
  return importSettlement(String(o.periodeBulan), String(o.noRefBayar ?? o.noRefBayer));
}
