// Mock data for the htop leaderboard, auth flow, and user profile

export interface MockRepo {
  id: string;
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  linkedNamespace: string | null;
}

export interface MockUser {
  id: string;
  username: string;
  avatar: string;
  namespace: string;
  walletAddress: string;
  joinedAt: string;
  repos: MockRepo[];
  tiaBalance: number; // remaining TIA for fees in uTIA
  feegrantAllowance: number; // total feegrant allowance in uTIA
  feegrantUsed: number; // amount used from feegrant in uTIA
}

export interface MockNamespace {
  id: string;
  name: string;
  owner: string;
  ownerAvatar: string;
  blobCount: number;
  dataSize: string;
  dataSizeBytes: number;
  submissionRate: number; // per hour
  lastActivity: string;
  lastActivityTimestamp: number;
  activityHistory: number[]; // last 10 intervals (percentage)
  isActive: boolean;
}

// Mock repos for current user
export const mockCurrentUserRepos: MockRepo[] = [
  {
    id: 'repo-1',
    name: 'celestia-rollup',
    fullName: 'yourusername/celestia-rollup',
    description: 'A sovereign rollup built on Celestia for DeFi applications',
    language: 'Rust',
    stars: 42,
    linkedNamespace: 'myapp/production',
  },
  {
    id: 'repo-2',
    name: 'blob-explorer',
    fullName: 'yourusername/blob-explorer',
    description: 'Web-based explorer for Celestia blob data',
    language: 'TypeScript',
    stars: 18,
    linkedNamespace: 'myapp/staging',
  },
  {
    id: 'repo-3',
    name: 'da-benchmarks',
    fullName: 'yourusername/da-benchmarks',
    description: 'Benchmarking suite for data availability layers',
    language: 'Go',
    stars: 7,
    linkedNamespace: null,
  },
];

// Mock current user profile
export const mockCurrentUser: MockUser = {
  id: 'current-user',
  username: 'yourusername',
  avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=yourusername',
  namespace: 'myapp/production',
  walletAddress: 'celestia1abc...xyz789',
  joinedAt: '2024-11-15',
  repos: mockCurrentUserRepos,
  tiaBalance: 7500000, // 7.5 TIA remaining
  feegrantAllowance: 10000000, // 10 TIA total allowance
  feegrantUsed: 2500000, // 2.5 TIA used
};

// Mock users with fun dev-themed usernames
export const mockUsers: MockUser[] = [
  {
    id: '1',
    username: 'celestia_dev',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=celestia',
    namespace: 'celestia/core',
    walletAddress: 'celestia1abc123def456789xyz...',
    joinedAt: '2024-01-15',
    repos: [
      { id: 'r1', name: 'celestia-node', fullName: 'celestia_dev/celestia-node', description: 'Core node implementation', language: 'Go', stars: 245, linkedNamespace: 'celestia/core' },
    ],
    tiaBalance: 8200000,
    feegrantAllowance: 10000000,
    feegrantUsed: 1800000,
  },
  {
    id: '2',
    username: 'rollup_queen',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=rollup',
    namespace: 'rollup/mainnet',
    walletAddress: 'celestia1xyz789abc123def456...',
    joinedAt: '2024-02-20',
    repos: [
      { id: 'r2', name: 'sovereign-sdk', fullName: 'rollup_queen/sovereign-sdk', description: 'SDK for building sovereign rollups', language: 'Rust', stars: 178, linkedNamespace: 'rollup/mainnet' },
    ],
    tiaBalance: 6500000,
    feegrantAllowance: 10000000,
    feegrantUsed: 3500000,
  },
  {
    id: '3',
    username: 'blob_master',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=blob',
    namespace: 'gaming/nft-drops',
    walletAddress: 'celestia1def456xyz789abc123...',
    joinedAt: '2024-03-10',
    repos: [
      { id: 'r3', name: 'nft-minter', fullName: 'blob_master/nft-minter', description: 'NFT minting on DA layer', language: 'Solidity', stars: 56, linkedNamespace: 'gaming/nft-drops' },
    ],
    tiaBalance: 9100000,
    feegrantAllowance: 10000000,
    feegrantUsed: 900000,
  },
  {
    id: '4',
    username: 'da_enjoyer',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=da',
    namespace: 'defi/orderbook',
    walletAddress: 'celestia1ghi789jkl012mno345...',
    joinedAt: '2024-03-25',
    repos: [
      { id: 'r4', name: 'clob-rollup', fullName: 'da_enjoyer/clob-rollup', description: 'Central limit order book rollup', language: 'Rust', stars: 89, linkedNamespace: 'defi/orderbook' },
    ],
    tiaBalance: 5800000,
    feegrantAllowance: 10000000,
    feegrantUsed: 4200000,
  },
  {
    id: '5',
    username: 'modular_maxi',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=modular',
    namespace: 'social/posts',
    walletAddress: 'celestia1pqr678stu901vwx234...',
    joinedAt: '2024-04-05',
    repos: [
      { id: 'r5', name: 'decentralized-twitter', fullName: 'modular_maxi/decentralized-twitter', description: 'Social media on Celestia', language: 'TypeScript', stars: 34, linkedNamespace: 'social/posts' },
    ],
    tiaBalance: 7200000,
    feegrantAllowance: 10000000,
    feegrantUsed: 2800000,
  },
  {
    id: '6',
    username: 'testnet_warrior',
    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=testnet',
    namespace: 'test/sandbox',
    walletAddress: 'celestia1yza345bcd678efg901...',
    joinedAt: '2024-04-18',
    repos: [
      { id: 'r6', name: 'test-scripts', fullName: 'testnet_warrior/test-scripts', description: 'Testing utilities', language: 'Python', stars: 12, linkedNamespace: 'test/sandbox' },
    ],
    tiaBalance: 9800000,
    feegrantAllowance: 10000000,
    feegrantUsed: 200000,
  },
];

// Mock namespaces with realistic activity data
export const mockNamespaces: MockNamespace[] = [
  {
    id: 'celestia/core',
    name: 'celestia/core',
    owner: 'celestia_dev',
    ownerAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=celestia',
    blobCount: 12847,
    dataSize: '42.8 MB',
    dataSizeBytes: 44874547,
    submissionRate: 156,
    lastActivity: '12s ago',
    lastActivityTimestamp: Date.now() - 12000,
    activityHistory: [78, 82, 75, 88, 92, 85, 79, 91, 87, 89],
    isActive: true,
  },
  {
    id: 'rollup/mainnet',
    name: 'rollup/mainnet',
    owner: 'rollup_queen',
    ownerAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=rollup',
    blobCount: 8432,
    dataSize: '28.1 MB',
    dataSizeBytes: 29465395,
    submissionRate: 89,
    lastActivity: '45s ago',
    lastActivityTimestamp: Date.now() - 45000,
    activityHistory: [65, 72, 68, 71, 75, 69, 73, 70, 74, 72],
    isActive: true,
  },
  {
    id: 'gaming/nft-drops',
    name: 'gaming/nft-drops',
    owner: 'blob_master',
    ownerAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=blob',
    blobCount: 3156,
    dataSize: '10.5 MB',
    dataSizeBytes: 11010048,
    submissionRate: 42,
    lastActivity: '2m ago',
    lastActivityTimestamp: Date.now() - 120000,
    activityHistory: [35, 48, 52, 45, 38, 55, 42, 49, 44, 47],
    isActive: true,
  },
  {
    id: 'defi/orderbook',
    name: 'defi/orderbook',
    owner: 'da_enjoyer',
    ownerAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=da',
    blobCount: 5621,
    dataSize: '18.7 MB',
    dataSizeBytes: 19608986,
    submissionRate: 67,
    lastActivity: '30s ago',
    lastActivityTimestamp: Date.now() - 30000,
    activityHistory: [58, 62, 55, 68, 64, 59, 71, 65, 63, 66],
    isActive: true,
  },
  {
    id: 'social/posts',
    name: 'social/posts',
    owner: 'modular_maxi',
    ownerAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=modular',
    blobCount: 1892,
    dataSize: '6.3 MB',
    dataSizeBytes: 6606028,
    submissionRate: 23,
    lastActivity: '5m ago',
    lastActivityTimestamp: Date.now() - 300000,
    activityHistory: [18, 25, 22, 28, 20, 24, 19, 26, 21, 23],
    isActive: true,
  },
  {
    id: 'test/sandbox',
    name: 'test/sandbox',
    owner: 'testnet_warrior',
    ownerAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=testnet',
    blobCount: 203,
    dataSize: '0.8 MB',
    dataSizeBytes: 838860,
    submissionRate: 3,
    lastActivity: '15m ago',
    lastActivityTimestamp: Date.now() - 900000,
    activityHistory: [5, 8, 3, 12, 6, 4, 9, 7, 5, 8],
    isActive: false,
  },
];

// Simulated namespace suggestions for the auth flow
export const suggestedNamespaces = [
  'myapp/production',
  'myapp/staging',
  'dev/experiments',
  'project/data',
];

// Function to generate fluctuating activity data (simulates real-time updates)
export function getUpdatedNamespaces(): MockNamespace[] {
  return mockNamespaces.map(ns => {
    // Randomly fluctuate activity
    const fluctuation = (Math.random() - 0.5) * 20;
    const newHistory = [...ns.activityHistory.slice(1), Math.max(0, Math.min(100, ns.activityHistory[9]! + fluctuation))];

    // Update blob count occasionally
    const newBlobs = ns.isActive ? Math.floor(Math.random() * 5) : 0;

    // Update last activity time
    const timeSinceLastActivity = Date.now() - ns.lastActivityTimestamp;
    let lastActivity = ns.lastActivity;
    if (timeSinceLastActivity < 60000) {
      lastActivity = `${Math.floor(timeSinceLastActivity / 1000)}s ago`;
    } else if (timeSinceLastActivity < 3600000) {
      lastActivity = `${Math.floor(timeSinceLastActivity / 60000)}m ago`;
    }

    return {
      ...ns,
      blobCount: ns.blobCount + newBlobs,
      activityHistory: newHistory,
      lastActivity: ns.isActive && Math.random() > 0.7 ? `${Math.floor(Math.random() * 30) + 1}s ago` : lastActivity,
      lastActivityTimestamp: ns.isActive && Math.random() > 0.7 ? Date.now() : ns.lastActivityTimestamp,
    };
  });
}

// Mock function to "create" a new namespace
export function createMockNamespace(name: string, owner: string): MockNamespace {
  return {
    id: name,
    name: name,
    owner: owner,
    ownerAvatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${owner}`,
    blobCount: 0,
    dataSize: '0 B',
    dataSizeBytes: 0,
    submissionRate: 0,
    lastActivity: 'just now',
    lastActivityTimestamp: Date.now(),
    activityHistory: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    isActive: true,
  };
}

// Get total network stats
export function getNetworkStats() {
  const totalBlobs = mockNamespaces.reduce((sum, ns) => sum + ns.blobCount, 0);
  const totalData = mockNamespaces.reduce((sum, ns) => sum + ns.dataSizeBytes, 0);
  const activeNamespaces = mockNamespaces.filter(ns => ns.isActive).length;
  const totalRate = mockNamespaces.reduce((sum, ns) => sum + ns.submissionRate, 0);
  const totalRepos = mockUsers.reduce((sum, u) => sum + u.repos.length, 0) + mockCurrentUserRepos.length;

  return {
    totalBlobs,
    totalData: formatBytes(totalData),
    totalDataBytes: totalData,
    activeNamespaces,
    totalNamespaces: mockNamespaces.length,
    totalRate,
    registeredDevs: mockUsers.length + 1, // +1 for current user
    linkedRepos: totalRepos,
  };
}

// Format TIA amount from uTIA
export function formatTia(utia: number): string {
  const tia = utia / 1000000;
  return `${tia.toFixed(2)} TIA`;
}

// Helper to format bytes
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
