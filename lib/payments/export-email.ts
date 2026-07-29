// ============================================================================
// Envío automático de docs de exportación al correo del comprador.
// Sin clave → dry-run (docs generados, status queued; listo para sandbox).
// Con RESEND_API_KEY → envío real vía API Resend (sin SDK pesado).
// ============================================================================

import type { ExportDocumentJob, PostCheckoutAutomationPlan } from '@/lib/payments/export-documents';
import { exportDocEmailSubject } from '@/lib/payments/export-documents';

export type DispatchResult = {
  dryRun: boolean;
  plan: PostCheckoutAutomationPlan;
  provider: 'none' | 'resend';
  message: string;
};

function fromAddress(): string {
  return (
    process.env.EXPORT_DOCS_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'docs@neotropicalspecimens.local'
  );
}

async function sendViaResend(job: ExportDocumentJob, orderId: string): Promise<ExportDocumentJob> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey || !job.html) {
    return { ...job, status: 'queued' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [job.toEmail],
      subject: exportDocEmailSubject(job.kind, orderId),
      html: job.html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    return { ...job, status: 'failed', error: detail.slice(0, 500) };
  }

  return { ...job, status: 'emailed' };
}

/**
 * Genera (ya viene en plan) y despacha automáticamente factura, packing list
 * y contrato al correo del cliente. Un correo por documento.
 */
export async function dispatchExportDocuments(
  plan: PostCheckoutAutomationPlan,
): Promise<DispatchResult> {
  const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
  const to = plan.toEmail.trim();

  if (!to || !to.includes('@')) {
    return {
      dryRun: true,
      provider: 'none',
      message: 'Correo del comprador inválido; docs generados pero no enviados.',
      plan: {
        ...plan,
        jobs: plan.jobs.map((j) => ({
          ...j,
          status: 'failed' as const,
          error: 'invalid_email',
        })),
      },
    };
  }

  if (!hasResend) {
    // Sandbox local: docs dinámicos listos; el envío real espera RESEND_API_KEY.
    return {
      dryRun: true,
      provider: 'none',
      message:
        'Documentos generados dinámicamente. Envío automático pendiente de RESEND_API_KEY / EXPORT_DOCS_FROM_EMAIL (sandbox).',
      plan: {
        ...plan,
        jobs: plan.jobs.map((j) => ({ ...j, status: 'queued' as const })),
      },
    };
  }

  const jobs: ExportDocumentJob[] = [];
  for (const job of plan.jobs) {
    jobs.push(await sendViaResend(job, plan.orderId));
  }

  const failed = jobs.filter((j) => j.status === 'failed').length;
  const emailed = jobs.filter((j) => j.status === 'emailed').length;

  return {
    dryRun: false,
    provider: 'resend',
    message:
      failed === 0
        ? `Enviados ${emailed} documentos a ${to}.`
        : `Enviados ${emailed}; fallaron ${failed}. Revisar logs.`,
    plan: { ...plan, jobs },
  };
}
