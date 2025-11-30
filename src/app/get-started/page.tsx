"use client";

import { useState } from "react";
import Image from "next/image";
import CodeBlock from "~/components/code-block";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { Users, FileCode, Key, Loader2, CheckCircle2, XCircle, Terminal, ExternalLink } from "lucide-react";
import { api } from "~/trpc/react";
import { truncateAddress } from "~/lib/formatting";
import { Button } from "~/components/ui/button";

const envExample = `# .env - Your Celestia configuration
# Get your private key from Keplr: Settings > Show Private Key

CELESTIA_PRIVATE_KEY="your_private_key_here"
CELESTIA_GRPC_ENDPOINT="celestia-testnet-consensus.itrocket.net:9090"
CELESTIA_BRIDGE_ENDPOINT="http://localhost:26658"
CELESTIA_NETWORK="mocha-4"`;

const goExample = `package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/cosmos/cosmos-sdk/crypto/keyring"
	libshare "github.com/celestiaorg/go-square/v3/share"
	"github.com/celestiaorg/celestia-node/api/client"
	"github.com/celestiaorg/celestia-node/blob"
)

func main() {
	// Load .env file
	godotenv.Load()

	// Setup keyring from private key
	keyname := "blobcell"
	kr, err := client.KeyringWithNewKey(client.KeyringConfig{
		KeyName:     keyname,
		BackendName: keyring.BackendTest,
	}, "./keys")
	if err != nil {
		panic(err)
	}

	// Configure client using env vars
	cfg := client.Config{
		ReadConfig: client.ReadConfig{
			BridgeDAAddr: os.Getenv("CELESTIA_BRIDGE_ENDPOINT"),
			DAAuthToken:  os.Getenv("CELESTIA_AUTH_TOKEN"),
		},
		SubmitConfig: client.SubmitConfig{
			DefaultKeyName: keyname,
			Network:        os.Getenv("CELESTIA_NETWORK"),
			CoreGRPCConfig: client.CoreGRPCConfig{
				Addr:       os.Getenv("CELESTIA_GRPC_ENDPOINT"),
				TLSEnabled: false,
			},
		},
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	// Create client
	c, err := client.New(ctx, cfg, kr)
	if err != nil {
		panic(err)
	}

	// Submit a blob - your fee grant covers this!
	namespace := libshare.MustNewV0Namespace([]byte("blobcell"))
	b, _ := blob.NewBlob(libshare.ShareVersionZero, namespace, []byte("hello from blobcell!"), nil)

	height, err := c.Blob.Submit(ctx, []*blob.Blob{b}, nil)
	if err != nil {
		panic(err)
	}
	fmt.Printf("Blob submitted at height: %d\\n", height)

	// Verify by retrieving
	retrieved, _ := c.Blob.Get(ctx, height, namespace, b.Commitment)
	fmt.Printf("Retrieved: %s\\n", string(retrieved.Data()))
}`;

const goModExample = `// go.mod
module myapp

go 1.21

require (
	github.com/celestiaorg/celestia-node v0.21.0
	github.com/celestiaorg/go-square/v3 v3.0.0
	github.com/cosmos/cosmos-sdk v0.50.0
	github.com/joho/godotenv v1.5.1
)`;

const rustExample = `// Cargo.toml dependencies:
// lumina-node-wasm = "0.6"  # For WASM/browser
// lumina-node = "0.6"       # For native

use lumina_node::blockstore::IndexedDbBlockstore;
use lumina_node::network::Network;
use lumina_node::node::{Node, NodeConfig};
use celestia_types::{Blob, nmt::Namespace};
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load from .env
    dotenv::dotenv().ok();
    let private_key = env::var("CELESTIA_PRIVATE_KEY")?;

    // Configure for Mocha testnet
    let config = NodeConfig::builder()
        .network(Network::Mocha)
        .private_key_hex(&private_key)
        .build()?;

    // Create light node
    let node = Node::new(config).await?;

    // Wait for sync
    node.wait_connected().await?;

    // Create and submit blob - fee grant covers fees!
    let namespace = Namespace::new_v0(&[0x42, 0x6c, 0x6f, 0x62])?;
    let data = b"hello from blobcell!";
    let blob = Blob::new(namespace, data.to_vec(), 0)?;

    let height = node.blob_submit(&[blob], None).await?;
    println!("Blob submitted at height: {}", height);

    // Retrieve to verify
    let blobs = node.blob_get_all(height, &[namespace]).await?;
    println!("Retrieved: {:?}", blobs);

    Ok(())
}`;

const rustCargoExample = `# Cargo.toml
[package]
name = "blobcell-example"
version = "0.1.0"
edition = "2021"

[dependencies]
lumina-node = "0.6"
celestia-types = "0.6"
tokio = { version = "1", features = ["full"] }
dotenv = "0.15"`;

export default function GetStartedPage() {
  const [activeTab, setActiveTab] = useState("go");

  // Fetch real leaderboard data
  const { data: leaderboard, isLoading } = api.stats.leaderboard.useQuery();

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-5xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Get Started</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Start submitting blobs to Celestia. Your feegrant covers all transaction fees.
            </p>
          </div>

          {/* Step 1: Environment Setup */}
          <section className="mb-8">
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-mono font-bold">
                    1
                  </div>
                  <CardTitle className="font-mono">Setup Environment</CardTitle>
                </div>
                <CardDescription>
                  Create a <code className="text-primary">.env</code> file with your credentials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Export Keys Section */}
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Key className="w-4 h-4 text-primary" />
                    Get Your Private Key from Keplr
                  </h4>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Open Keplr extension → Click <strong>account icon</strong> (top right)</li>
                    <li>Select <strong>&quot;Show Private Key&quot;</strong></li>
                    <li>Enter password and copy the key</li>
                  </ol>
                </div>

                <CodeBlock
                  code={envExample}
                  language="bash"
                  title=".env"
                />

                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">
                    Never commit <code>.env</code> to git. Add it to <code>.gitignore</code>
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
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-mono font-bold">
                    2
                  </div>
                  <CardTitle className="font-mono">Submit Your First Blob</CardTitle>
                </div>
                <CardDescription>
                  Choose your language and start building
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="go" className="gap-2">
                      <FileCode className="w-4 h-4" />
                      Go
                    </TabsTrigger>
                    <TabsTrigger value="rust" className="gap-2">
                      <FileCode className="w-4 h-4" />
                      Rust
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="go" className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Terminal className="w-4 h-4 text-muted-foreground" />
                      <code className="text-sm text-muted-foreground">
                        go get github.com/celestiaorg/celestia-node/api/client
                      </code>
                    </div>
                    <CodeBlock
                      code={goModExample}
                      language="go"
                      title="go.mod"
                    />
                    <CodeBlock
                      code={goExample}
                      language="go"
                      title="main.go"
                    />
                    <Button variant="outline" size="sm" asChild className="font-mono">
                      <a
                        href="https://github.com/celestiaorg/celestia-node/tree/main/api/client"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Full Go Client Docs
                      </a>
                    </Button>
                  </TabsContent>

                  <TabsContent value="rust" className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Terminal className="w-4 h-4 text-muted-foreground" />
                      <code className="text-sm text-muted-foreground">
                        cargo add lumina-node celestia-types
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
                    <Button variant="outline" size="sm" asChild className="font-mono">
                      <a
                        href="https://github.com/eigerco/lumina"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Lumina Rust Client Docs
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
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-mono font-bold">
                    3
                  </div>
                  <CardTitle className="font-mono">Run & Verify</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <h4 className="font-mono font-semibold mb-2 flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-primary" />
                      Go
                    </h4>
                    <code className="text-sm text-muted-foreground block">
                      go run main.go
                    </code>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <h4 className="font-mono font-semibold mb-2 flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-primary" />
                      Rust
                    </h4>
                    <code className="text-sm text-muted-foreground block">
                      cargo run
                    </code>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <p className="text-sm">
                    Your feegrant covers all transaction fees. Check your blob on{" "}
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
                    <Users className="w-5 h-5 text-primary" />
                    <CardTitle>Community</CardTitle>
                  </div>
                  <Badge variant="secondary">
                    {isLoading ? "..." : `${leaderboard?.length ?? 0} developers`}
                  </Badge>
                </div>
                <CardDescription>
                  Developers building with BlobCell
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : leaderboard && leaderboard.length > 0 ? (
                  <div className="space-y-3">
                    {leaderboard.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Image
                            src={user.avatar}
                            alt={user.username}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full border border-border"
                            unoptimized
                          />
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {truncateAddress(user.walletAddress)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            {user.hasFeeGrant ? (
                              <CheckCircle2 className="w-4 h-4 text-primary" />
                            ) : (
                              <XCircle className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {user.hasFeeGrant ? "Feegrant" : "Pending"}
                            </span>
                          </div>
                          <Badge variant={user.isDusted ? "default" : "secondary"} className="font-mono text-xs">
                            {user.isDusted ? "Dusted" : "Not dusted"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
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
