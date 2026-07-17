import { Mail } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { MailView } from "@/components/mail/mail-view";
import { getMailMessages } from "@/features/integrations/queries";
import { getWorkspaceOrder } from "@/features/tasks/section-order";

export const metadata = { title: "Mail" };

/** ?abn=<mail-id> åbner en bestemt mail direkte (bruges af faktura-påmindelsen). */
export default async function MailPage({
  searchParams,
}: {
  searchParams: Promise<{ abn?: string }>;
}) {
  const { abn } = await searchParams;
  const mails = await getMailMessages(100);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Mail"
        description="Outlook (arbejde) og Gmail (privat) samlet og prioriteret efter tid på dagen."
        icon={Mail}
      />
      <MailView mails={mails} initialOrder={getWorkspaceOrder()} openMailId={abn} />
    </div>
  );
}
