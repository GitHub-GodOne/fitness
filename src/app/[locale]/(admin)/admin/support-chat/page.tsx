import { getTranslations, setRequestLocale } from "next-intl/server";

import { PERMISSIONS, requirePermission } from "@/core/rbac";
import { Header, Main, MainHeader } from "@/shared/blocks/dashboard";
import { TableCard } from "@/shared/blocks/table";
import { getUsersWithSupportMessages } from "@/shared/models/support_chat_message";
import { Button, Crumb } from "@/shared/types/blocks/common";
import { type Table } from "@/shared/types/blocks/table";

export default async function SupportChatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.ADMIN_ACCESS,
    redirectUrl: "/admin/no-permission",
    locale,
  });

  const usersWithMessages = await getUsersWithSupportMessages();

  const crumbs: Crumb[] = [
    { title: "Admin", url: "/admin" },
    { title: "Support Chat", is_active: true },
  ];

  const table: Table = {
    columns: [
      { name: "user", title: "User", type: "user" },
      { name: "lastMessageAt", title: "Last Message", type: "time" },
      { name: "unreadCount", title: "Unread", type: "label" },
      {
        name: "action",
        title: "Action",
        type: "dropdown",
        callback: (item) => {
          return [
            {
              title: "View Chat",
              url: `/admin/support-chat/${item.userId}`,
              icon: "RiEyeLine",
            },
          ];
        },
      },
    ],
    data: usersWithMessages,
    pagination: { total: usersWithMessages.length, page: 1, limit: 50 },
  };

  const actions: Button[] = [];

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title="Online Support" actions={actions} />
        <TableCard table={table} />
      </Main>
    </>
  );
}
