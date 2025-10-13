import { Insight } from "thirdweb";
import { createThirdwebClient } from "thirdweb";
import { defineChain } from "thirdweb";
import { useUserStore } from '~/stores/user';

export async function fetchNFTs() {
  // const network = Number(import.meta.env.VITE_NETWORK);
  // const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID as string | undefined;
  // const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL as string | undefined;

  //获取当前用户钱包地址
  const userStore = useUserStore();
  const user = userStore.user;
  const walletAddress = user?.evm_chain_address as `0x${string}`;
  const clientId = "cb6e665e49c1e28108a2d14f3cd38a0d" as const;
  const rpcUrl = "https://11155111.rpc.thirdweb.com"; // 可以先用 thirdweb 默认 RPC，别忘了后面再换回环境变量
  // const walletAddress = "0x6D489C852Cd04D616Bb270748B8527a51eAC9002" as const;

  // 检查用户是否已登录
  if (!walletAddress) {
    throw new Error('用户未登录或钱包地址未设置');
  }
  
  if (!clientId) {
    throw new Error('VITE_THIRDWEB_CLIENT_ID 环境变量未设置');
  }
  
  try {
    const client = createThirdwebClient({ clientId });

    const chain = defineChain({
      id: 11155111,
      name: "Sepolia",
      nativeCurrency: {
        name: "Sepolia Ether",
        symbol: "ETH",
        decimals: 18,
      },
      rpc: rpcUrl, // 
      testnet: true, // Sepolia 是测试网
    });
    
    // 🔍 添加详细的调试信息
    console.log(`[${new Date().toISOString()}] [RECV] 接收数据: 开始获取用户NFT, 钱包=${walletAddress}`);
  
    const nfts = await Insight.getOwnedNFTs({
      client,
      chains: [chain],
      ownerAddress: walletAddress,
    });
    return nfts;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [RECV] 接收数据: 获取NFT失败 -> ${String(error)}`);
    throw error;
  }
}

/**
 * 将 ipfs:// 链接解析为可在浏览器加载的 HTTP 网关链接
 * 可通过 VITE_IPFS_GATEWAY 自定义网关（例如：https://cloudflare-ipfs.com 或 https://ipfs.io）
 */
export function resolveIpfsUrl(url?: string): string {
  if (!url) return '';
  // 已是 http(s) 链接，直接返回
  if (/^https?:\/\//i.test(url)) return url;

  // 处理 ipfs:// 链接
  if (/^ipfs:\/\//i.test(url)) {
    // 允许用户通过环境变量自定义网关根，例如：https://cloudflare-ipfs.com 或 https://nftstorage.link
    let gatewayBase = (import.meta as any).env?.VITE_IPFS_GATEWAY as string | undefined;
    if (!gatewayBase || typeof gatewayBase !== 'string') {
      gatewayBase = 'https://cloudflare-ipfs.com';
    }

    // 规范化：去除末尾斜杠与末尾 /ipfs
    gatewayBase = gatewayBase.replace(/\/+$/g, '').replace(/\/ipfs$/i, '');

    // 去除 ipfs:// 或 ipfs://ipfs/ 前缀
    const stripped = url.replace(/^ipfs:\/\/(ipfs\/)?/i, '');
    return `${gatewayBase}/ipfs/${stripped}`;
  }

  // 其他协议（如 ar://）可按需扩展，这里先原样返回
  return url;
}

/**
 * 根据环境变量或内置默认值，返回一组候选 IPFS 网关根地址
 * - 支持 `VITE_IPFS_GATEWAYS` 逗号分隔列表
 * - 兼容 `VITE_IPFS_GATEWAY` 单个值
 */
export function getDefaultIpfsGateways(): string[] {
  const envList = (import.meta as any).env?.VITE_IPFS_GATEWAYS as string | undefined;
  const single = (import.meta as any).env?.VITE_IPFS_GATEWAY as string | undefined;

  let bases: string[] = [];
  if (envList && typeof envList === 'string') {
    bases = envList
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (single && typeof single === 'string') {
    bases = [single];
  }

  if (bases.length === 0) {
    bases = [
      'https://cloudflare-ipfs.com',
      'https://nftstorage.link',
      'https://ipfs.io',
      'https://dweb.link',
      'https://gateway.pinata.cloud',
    ];
  }

  return bases.map((b) => b.replace(/\/+$/g, '').replace(/\/ipfs$/i, ''));
}

/**
 * 为给定 URL 构建多个候选加载地址，用于图片加载失败时回退
 */
export function buildIpfsGatewayUrls(url?: string): string[] {
  if (!url) return [];
  if (/^https?:\/\//i.test(url)) return [url];

  if (/^ipfs:\/\//i.test(url)) {
    const stripped = url.replace(/^ipfs:\/\/(ipfs\/)?/i, '');
    const bases = getDefaultIpfsGateways();
    return bases.map((b) => `${b}/ipfs/${stripped}`);
  }

  // 其他协议暂不特殊处理
  return [url];
}