import { ReactNode } from "react";

import {
  Footer as FooterType,
  Header as HeaderType,
} from "@/shared/types/blocks/landing";
import { Footer, Header } from "@/themes/default/blocks";

export default async function LandingLayout({
  children,
  header,
  footer,
  mobileHeaderNavMode,
}: {
  children: ReactNode;
  header: HeaderType;
  footer: FooterType;
  mobileHeaderNavMode?: 'accordion' | 'tabs';
}) {
  return (
    <div className="h-screen w-screen">
      <Header header={header} mobileNavMode={mobileHeaderNavMode} />
      <div className={mobileHeaderNavMode === 'tabs' ? 'max-lg:pt-10' : undefined}>
        {children}
      </div>
      <Footer footer={footer} />
    </div>
  );
}
