"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ParaProvider } from "@getpara/react-sdk";
import "@getpara/react-sdk/styles.css";

const queryClient = new QueryClient();

export function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <QueryClientProvider client={queryClient}>
      <ParaProvider
        paraClientConfig={{
          apiKey: String(process.env.NEXT_PUBLIC_PARA_API_KEY),
        }}
        config={{
            appName: "Blonker",
            chains: [
                {
                    chainId: "mocha-4",
                    chainName: "Celestia Mocha Testnet",
                },
            ],
        } as never}
      >
        {children}
      </ParaProvider>
    </QueryClientProvider>
  );
}
