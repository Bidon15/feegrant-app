import { env } from "~/env";

export async function getCommitmentFromSidecar(
  namespaceHex: string,
  blob: Uint8Array
): Promise<Uint8Array> {
  const response = await fetch(env.COMMIT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      namespace: namespaceHex,
      blobBase64: Buffer.from(blob).toString("base64"),
      shareVersion: 0,
      namespaceIsHex: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Commitment API failed: ${response.status} ${errorText}`);
  }

  const { commitmentBase64 } = await response.json();
  return Buffer.from(commitmentBase64, "base64");
}
