"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { TAPMO_PRIVY_APP_ID } from "@/lib/privy-config";

export default function TapmoPrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PrivyProvider
      appId={TAPMO_PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: {
          theme: "light",
          showWalletLoginFirst: false,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
