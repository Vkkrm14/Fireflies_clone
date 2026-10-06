import { Sparkles } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "./Badge";
import { EmptyState } from "./EmptyState";

export interface ComingSoonProps {
  title: string;
  description: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <PageContainer width="narrow">
      <EmptyState
        icon={<Sparkles size={24} />}
        title={title}
        description={description}
        action={<Badge tone="brand" dot>Coming soon</Badge>}
      />
    </PageContainer>
  );
}
