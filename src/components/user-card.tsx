import { Badge } from "~/components/ui/badge";
import { Github, Wallet } from "lucide-react";

interface UserCardProps {
  walletAddress: string;
  githubUsername: string;
  hasFeegrant: boolean;
  joinDate: string;
}

const UserCard = ({ walletAddress, githubUsername, hasFeegrant, joinDate }: UserCardProps) => {
  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 10)}...${addr.slice(-6)}`;
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg glass hover:glow-purple transition-all duration-300">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">
            {githubUsername.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Github className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">{githubUsername}</span>
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-xs text-muted-foreground">
              {truncateAddress(walletAddress)}
            </span>
          </div>
        </div>
      </div>

      {/* Status & Date */}
      <div className="flex flex-col items-end gap-1">
        <Badge variant={hasFeegrant ? "default" : "secondary"}>
          {hasFeegrant ? "Active" : "Pending"}
        </Badge>
        <span className="text-xs text-muted-foreground">{joinDate}</span>
      </div>
    </div>
  );
};

export default UserCard;
