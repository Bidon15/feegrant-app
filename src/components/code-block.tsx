"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "~/components/ui/button";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

const CodeBlock = ({ code, language = "bash", title }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border bg-secondary/50 overflow-hidden">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
          <span className="text-sm text-muted-foreground font-mono">{title}</span>
          <span className="text-xs text-muted-foreground uppercase">{language}</span>
        </div>
      )}
      <div className="relative">
        <pre className="p-4 overflow-x-auto text-sm">
          <code className="font-mono text-foreground">{code}</code>
        </pre>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 opacity-70 hover:opacity-100"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default CodeBlock;
