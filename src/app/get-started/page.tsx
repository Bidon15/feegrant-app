"use client";

import { useState } from "react";
import Image from "next/image";
import CodeBlock from "~/components/code-block";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { Users, Code, FileCode, Key, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { api } from "~/trpc/react";
import { truncateAddress } from "~/lib/formatting";

const goExample = `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

func submitBlob(namespace, data string) error {
    payload := map[string]interface{}{
        "namespace": namespace,
        "data":      data,
        "gas_limit": 80000,
    }

    body, _ := json.Marshal(payload)
    req, _ := http.NewRequest("POST", "https://api.blobcell.dev/v1/blob", bytes.NewBuffer(body))
    req.Header.Set("Authorization", "Bearer YOUR_API_KEY")
    req.Header.Set("Content-Type", "application/json")

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    fmt.Printf("Tx Hash: %s\\n", result["txHash"])
    return nil
}`;

const rustExample = `use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct BlobRequest {
    namespace: String,
    data: String,
    gas_limit: u64,
}

#[derive(Deserialize)]
struct BlobResponse {
    tx_hash: String,
    height: u64,
}

async fn submit_blob(namespace: &str, data: &str) -> Result<BlobResponse, reqwest::Error> {
    let client = Client::new();
    let request = BlobRequest {
        namespace: namespace.to_string(),
        data: data.to_string(),
        gas_limit: 80000,
    };

    let response = client
        .post("https://api.blobcell.dev/v1/blob")
        .header("Authorization", "Bearer YOUR_API_KEY")
        .json(&request)
        .send()
        .await?
        .json::<BlobResponse>()
        .await?;

    println!("Tx Hash: {}", response.tx_hash);
    Ok(response)
}`;

const responseExample = `{
  "success": true,
  "txHash": "ABC123DEF456789...",
  "height": 1234567,
  "namespace": "your_namespace",
  "commitment": "0x...",
  "explorerUrl": "https://mocha.celenium.io/tx/ABC123..."
}`;

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
              Everything you need to start submitting blobs to Celestia with zero gas fees.
            </p>
          </div>

          {/* Code Snippets Section */}
          <section className="mb-16">
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-primary" />
                  <CardTitle>Quick Start</CardTitle>
                </div>
                <CardDescription>
                  Copy these code snippets to start submitting blobs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Export Keys Section */}
                <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Key className="w-4 h-4 text-primary" />
                    Export Your Private Key
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    To use BlobCell in your repos, export your private key from Keplr:
                  </p>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Open Keplr extension and click the <strong>account icon</strong> (top right)</li>
                    <li>Select <strong>&quot;Show Private Key&quot;</strong> from the menu</li>
                    <li>Enter your password to reveal the key</li>
                    <li>Copy and store securely as an environment variable:</li>
                  </ol>
                  <div className="mt-3 p-2 rounded bg-background font-mono text-xs">
                    export CELESTIA_PRIVATE_KEY=&quot;your_private_key_here&quot;
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Never commit your private key to version control
                  </p>
                </div>

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
                    <CodeBlock
                      code={goExample}
                      language="go"
                      title="Submit a blob with Go"
                    />
                  </TabsContent>

                  <TabsContent value="rust" className="space-y-4">
                    <CodeBlock
                      code={rustExample}
                      language="rust"
                      title="Submit a blob with Rust"
                    />
                  </TabsContent>
                </Tabs>

                {/* Response Example */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-3 text-muted-foreground">Response</h4>
                  <CodeBlock
                    code={responseExample}
                    language="json"
                    title="Success Response"
                  />
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
