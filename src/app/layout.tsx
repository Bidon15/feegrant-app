import "~/styles/globals.css";
import { type Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { TRPCReactProvider } from "~/trpc/react";
import { Providers } from "~/app/_components/providers";
import Navigation from "~/components/navigation";
import { TooltipProvider } from "~/components/ui/tooltip";

export const metadata: Metadata = {
  title: "BlobCell - Submit Blobs to Celestia",
  description: "Get 10 TIA free to start. We cover the fees so you can focus on building.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <TRPCReactProvider>
          <Providers>
            <TooltipProvider>
              <Navigation />
              {children}
            </TooltipProvider>
          </Providers>
        </TRPCReactProvider>
        <Analytics />
      </body>
    </html>
  );
}
