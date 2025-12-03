"use client";

import { useState } from "react";
import Image from "next/image";
import CodeBlock from "~/components/code-block";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import {
  Users,
  FileCode,
  Key,
  Loader2,
  Terminal,
  ExternalLink,
  Box,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";

const envExample = `# .env - Your Celestia configuration
# Get your private key from Keplr: Settings > Show Private Key

CELESTIA_PRIVATE_KEY="your_hex_private_key_here"
CELESTIA_RPC_URL="http://localhost:26658"
CELESTIA_GRPC_URL="http://localhost:9090"
CELESTIA_NETWORK="mocha-4"`;

const goExample = `package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/cosmos/cosmos-sdk/crypto/keyring"
	libshare "github.com/celestiaorg/go-square/v2/share"
	"github.com/celestiaorg/celestia-node/api/client"
	"github.com/celestiaorg/celestia-node/blob"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		fmt.Println("No .env file found, using environment variables")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	// Setup keyring
	keyname := "blobcell"
	kr, err := client.KeyringWithNewKey(client.KeyringConfig{
		KeyName:     keyname,
		BackendName: keyring.BackendTest,
	}, "./keys")
	if err != nil {
		panic(fmt.Sprintf("Failed to create keyring: %v", err))
	}

	// Configure client using env vars
	cfg := client.Config{
		ReadConfig: client.ReadConfig{
			BridgeDAAddr: os.Getenv("CELESTIA_RPC_URL"),
			DAAuthToken:  os.Getenv("CELESTIA_AUTH_TOKEN"),
		},
		SubmitConfig: client.SubmitConfig{
			DefaultKeyName: keyname,
			Network:        os.Getenv("CELESTIA_NETWORK"),
			CoreGRPCConfig: client.CoreGRPCConfig{
				Addr:       os.Getenv("CELESTIA_GRPC_URL"),
				TLSEnabled: false,
			},
		},
	}

	// Create client
	c, err := client.New(ctx, cfg, kr)
	if err != nil {
		panic(fmt.Sprintf("Failed to create client: %v", err))
	}

	// Create namespace for your blobs
	namespace := libshare.MustNewV0Namespace([]byte("blobcell"))

	// Submit 3 blobs to demonstrate the workflow
	fmt.Println("Submitting 3 blobs to Celestia...\\n")

	for i := 1; i <= 3; i++ {
		// Create unique blob data
		data := fmt.Sprintf("Hello from BlobCell! Message #%d at %s",
			i, time.Now().Format(time.RFC3339))

		b, err := blob.NewBlob(libshare.ShareVersionZero, namespace, []byte(data), nil)
		if err != nil {
			panic(fmt.Sprintf("Failed to create blob %d: %v", i, err))
		}

		// Submit - your fee grant covers this!
		height, err := c.Blob.Submit(ctx, []*blob.Blob{b}, nil)
		if err != nil {
			panic(fmt.Sprintf("Failed to submit blob %d: %v", i, err))
		}
		fmt.Printf("✓ Blob %d submitted at height %d\\n", i, height)

		// Verify by retrieving
		retrieved, err := c.Blob.Get(ctx, height, namespace, b.Commitment)
		if err != nil {
			fmt.Printf("  Warning: Could not verify blob %d: %v\\n", i, err)
		} else {
			fmt.Printf("  ✓ Verified: %s\\n", string(retrieved.Data()))
		}

		// Small delay between submissions
		if i < 3 {
			time.Sleep(2 * time.Second)
		}
	}

	fmt.Println("\\n🎉 All 3 blobs submitted successfully!")
	fmt.Println("View your blobs on https://mocha.celenium.io")
}`;

const goModExample = `// go.mod
module blobcell-example

go 1.24

require (
	github.com/celestiaorg/celestia-node v0.28.4-mocha
	github.com/celestiaorg/go-square/v2 v2.1.0
	github.com/cosmos/cosmos-sdk v0.46.16
	github.com/joho/godotenv v1.5.1
)`;

const rustExample = `use std::env;
use std::str;

use celestia_client::{Client, Result};
use celestia_client::tx::TxConfig;
use celestia_client::types::nmt::Namespace;
use celestia_client::types::{AppVersion, Blob};

#[tokio::main]
async fn main() -> Result<()> {
    // Load from .env
    dotenv::dotenv().ok();

    let rpc_url = env::var("CELESTIA_RPC_URL")
        .unwrap_or_else(|_| "http://localhost:26658".to_string());
    let grpc_url = env::var("CELESTIA_GRPC_URL")
        .unwrap_or_else(|_| "http://localhost:9090".to_string());
    let private_key = env::var("CELESTIA_PRIVATE_KEY")
        .expect("CELESTIA_PRIVATE_KEY must be set");

    // Create client
    let client = Client::builder()
        .rpc_url(&rpc_url)
        .grpc_url(&grpc_url)
        .private_key_hex(&private_key)
        .build()
        .await?;

    // Create namespace for your blobs
    let ns = Namespace::new_v0(b"blobcell")?;

    println!("Submitting 3 blobs to Celestia...\\n");

    // Submit 3 blobs to demonstrate the workflow
    for i in 1..=3 {
        // Create unique blob data
        let data = format!(
            "Hello from BlobCell! Message #{} at {}",
            i,
            chrono::Utc::now().to_rfc3339()
        );

        let blob = Blob::new(
            ns,
            data.as_bytes().to_vec(),
            Some(client.address()?),
            AppVersion::V3,
        )?;

        // Store commitment for verification
        let commitment = blob.commitment.clone();

        // Submit - your fee grant covers this!
        let tx_info = client.blob().submit(&[blob], TxConfig::default()).await?;
        println!("✓ Blob {} submitted at height {}", i, tx_info.height.value());

        // Verify by retrieving
        match client.blob().get(tx_info.height.value(), ns, commitment).await {
            Ok(retrieved) => {
                println!("  ✓ Verified: {}", str::from_utf8(&retrieved.data).unwrap());
            }
            Err(e) => {
                println!("  Warning: Could not verify blob {}: {}", i, e);
            }
        }

        // Small delay between submissions
        if i < 3 {
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        }
    }

    println!("\\n🎉 All 3 blobs submitted successfully!");
    println!("View your blobs on https://mocha.celenium.io");

    Ok(())
}`;

const rustCargoExample = `# Cargo.toml
[package]
name = "blobcell-example"
version = "0.1.0"
edition = "2021"

[dependencies]
celestia-client = { git = "https://github.com/eigerco/lumina", branch = "main" }
tokio = { version = "1", features = ["full"] }
chrono = "0.4"
dotenv = "0.15"`;

export default function GetStartedPage() {
  const [activeTab, setActiveTab] = useState("go");

  // Fetch real leaderboard data
  const { data: leaderboard, isLoading } = api.stats.leaderboard.useQuery();

  return (
    <div className="bg-background min-h-screen">
      <main className="px-4 pt-32 pb-20">
        <div className="container mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold">Get Started</h1>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              Start submitting blobs to Celestia. Your feegrant covers all
              transaction fees.
            </p>
          </div>

          {/* Step 1: Environment Setup */}
          <section className="mb-8">
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="bg-primary/20 border-primary/30 text-primary flex h-8 w-8 items-center justify-center rounded-full border font-mono font-bold">
                    1
                  </div>
                  <CardTitle className="font-mono">Setup Environment</CardTitle>
                </div>
                <CardDescription>
                  Create a <code className="text-primary">.env</code> file with
                  your credentials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Export Keys Section */}
                <div className="bg-muted/50 border-border rounded-lg border p-4">
                  <h4 className="mb-2 flex items-center gap-2 font-semibold">
                    <Key className="text-primary h-4 w-4" />
                    Get Your Private Key from Keplr
                  </h4>
                  <ol className="text-muted-foreground list-inside list-decimal space-y-2 text-sm">
                    <li>
                      Open Keplr extension → Click <strong>account icon</strong>{" "}
                      (top right)
                    </li>
                    <li>
                      Select <strong>&quot;Show Private Key&quot;</strong>
                    </li>
                    <li>Enter password and copy the key</li>
                  </ol>
                </div>

                <CodeBlock code={envExample} language="bash" title=".env" />

                <div className="bg-destructive/10 border-destructive/20 flex items-start gap-2 rounded-lg border p-3">
                  <XCircle className="text-destructive mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p className="text-destructive text-sm">
                    Never commit <code>.env</code> to git. Add it to{" "}
                    <code>.gitignore</code>
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Step 2: Code Snippets */}
          <section className="mb-8">
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="bg-primary/20 border-primary/30 text-primary flex h-8 w-8 items-center justify-center rounded-full border font-mono font-bold">
                    2
                  </div>
                  <CardTitle className="font-mono">
                    Submit Your First Blob
                  </CardTitle>
                </div>
                <CardDescription>
                  Choose your language and start building
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="go" className="gap-2">
                      <FileCode className="h-4 w-4" />
                      Go
                    </TabsTrigger>
                    <TabsTrigger value="rust" className="gap-2">
                      <FileCode className="h-4 w-4" />
                      Rust
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="go" className="space-y-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Terminal className="text-muted-foreground h-4 w-4" />
                      <code className="text-muted-foreground text-sm">
                        go mod init blobcell-example && go mod tidy
                      </code>
                    </div>
                    <CodeBlock
                      code={goModExample}
                      language="go"
                      title="go.mod"
                    />
                    <CodeBlock code={goExample} language="go" title="main.go" />
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="font-mono"
                    >
                      <a
                        href="https://github.com/celestiaorg/celestia-node/tree/main/api/client"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Full Go Client Docs
                      </a>
                    </Button>
                  </TabsContent>

                  <TabsContent value="rust" className="space-y-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Terminal className="text-muted-foreground h-4 w-4" />
                      <code className="text-muted-foreground text-sm">
                        cargo new blobcell-example && cd blobcell-example
                      </code>
                    </div>
                    <CodeBlock
                      code={rustCargoExample}
                      language="toml"
                      title="Cargo.toml"
                    />
                    <CodeBlock
                      code={rustExample}
                      language="rust"
                      title="src/main.rs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="font-mono"
                    >
                      <a
                        href="https://github.com/eigerco/lumina/tree/main/client"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Celestia Client Docs
                      </a>
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </section>

          {/* Step 3: Run */}
          <section className="mb-16">
            <Card className="glass border-primary/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="bg-primary/20 border-primary/30 text-primary flex h-8 w-8 items-center justify-center rounded-full border font-mono font-bold">
                    3
                  </div>
                  <CardTitle className="font-mono">Run & Verify</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-muted/30 border-border rounded-lg border p-4">
                    <h4 className="mb-2 flex items-center gap-2 font-mono font-semibold">
                      <Terminal className="text-primary h-4 w-4" />
                      Go
                    </h4>
                    <code className="text-muted-foreground block text-sm">
                      go run main.go
                    </code>
                  </div>
                  <div className="bg-muted/30 border-border rounded-lg border p-4">
                    <h4 className="mb-2 flex items-center gap-2 font-mono font-semibold">
                      <Terminal className="text-primary h-4 w-4" />
                      Rust
                    </h4>
                    <code className="text-muted-foreground block text-sm">
                      cargo run
                    </code>
                  </div>
                </div>
                <div className="bg-primary/10 border-primary/20 flex items-center gap-2 rounded-lg border p-3">
                  <CheckCircle2 className="text-primary h-4 w-4 flex-shrink-0" />
                  <p className="text-sm">
                    Your feegrant covers all transaction fees. Check your blob
                    on{" "}
                    <a
                      href="https://mocha.celenium.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      Celenium Explorer
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Community Section - Real Data */}
          <section>
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="text-primary h-5 w-5" />
                    <CardTitle>Community</CardTitle>
                  </div>
                  <Badge variant="secondary">
                    {isLoading
                      ? "..."
                      : `${leaderboard?.length ?? 0} namespaces`}
                  </Badge>
                </div>
                <CardDescription>
                  Developers building with BlobCell
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="text-primary h-6 w-6 animate-spin" />
                  </div>
                ) : leaderboard && leaderboard.length > 0 ? (
                  <div className="space-y-3">
                    {leaderboard.slice(0, 5).map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-muted/20 border-border/50 hover:bg-muted/30 flex items-center justify-between rounded-lg border p-4 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Image
                            src={entry.avatar}
                            alt={entry.username}
                            width={40}
                            height={40}
                            className="border-border h-10 w-10 rounded-full border"
                            unoptimized
                          />
                          <div>
                            <div className="font-medium">@{entry.username}</div>
                            <div className="text-muted-foreground font-mono text-xs">
                              {entry.namespaceName}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Box className="text-primary h-4 w-4" />
                            <span className="text-muted-foreground text-xs">
                              {entry.blobCount} blobs
                            </span>
                          </div>
                          <Badge
                            variant={entry.hasOnChainActivity ? "default" : "secondary"}
                            className="font-mono text-xs"
                          >
                            {entry.totalBytesFormatted}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground py-8 text-center">
                    <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    <p>No developers yet. Be the first!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}
