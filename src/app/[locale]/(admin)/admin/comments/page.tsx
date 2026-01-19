import { Metadata } from 'next';

import { PageHeader } from '@/shared/blocks/common';
import { CommentManagement } from '@/shared/blocks/dashboard/comment-management';

export const metadata: Metadata = {
  title: '评论管理',
  description: '管理用户评论和回复',
};

export default async function CommentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="评论管理"
        description="查看和管理所有用户评论及回复"
      />
      <CommentManagement />
    </div>
  );
}
