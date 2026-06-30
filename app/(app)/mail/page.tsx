import { Mail } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { MailView } from "@/components/mail/mail-view";
import { getMailMessages } from "@/features/integrations/queries";
import { getWorkspaceOrder } from "@/features/tasks/section-order";

export const metadata = { title: "Mail" };

export default async function MailPage() {
  const mails = await getMailMessages(100);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Mail"
        description="Outlook (arbejde) og Gmail (privat) samlet og prioriteret efter tid på dagen."
        icon={Mail}
      />
      <MailView mails={mails} initialOrder={getWorkspaceOrder()} />
    </div>
  );
}
