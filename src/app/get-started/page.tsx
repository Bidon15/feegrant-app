"use client";

import { useState } from "react";
import CodeBlock from "~/components/code-block";
import UserCard from "~/components/user-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { Users, Code, FileCode, Key } from "lucide-react";

// Mock users data
const mockUsers = [
  {
    walletAddress: "celestia1abc123def456ghi789jkl012mno345pqr678stu",
    githubUsername: "alice_dev",
    hasFeegrant: true,
    joinDate: "Nov 25, 2024",
  },
  {
    walletAddress: "celestia1xyz987wvu654tsr321qpo098nml765kji432hgf",
    githubUsername: "bob_builder",
    hasFeegrant: true,
    joinDate: "Nov 24, 2024",
  },
  {
    walletAddress: "celestia1def456abc123xyz789qwe456rty789uio123asd",
    githubUsername: "charlie_cosmos",
    hasFeegrant: false,
    joinDate: "Nov 23, 2024",
  },
  {
    walletAddress: "celestia1qwe123asd456zxc789poi098lkj765mnb432vcx",
    githubUsername: "diana_data",
    hasFeegrant: true,
    joinDate: "Nov 22, 2024",
  },
  {
    walletAddress: "celestia1poi098lkj765mnb432vcxqwe123asd456zxc789",
    githubUsername: "eve_engineer",
    hasFeegrant: true,
    joinDate: "Nov 21, 2024",
  },
];

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

          {/* All Users Section */}
          <section>
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <CardTitle>Community</CardTitle>
                  </div>
                  <Badge variant="secondary">{mockUsers.length} developers</Badge>
                </div>
                <CardDescription>
                  Developers building with BlobCell
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockUsers.map((user, index) => (
                    <UserCard
                      key={index}
                      walletAddress={user.walletAddress}
                      githubUsername={user.githubUsername}
                      hasFeegrant={user.hasFeegrant}
                      joinDate={user.joinDate}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}
