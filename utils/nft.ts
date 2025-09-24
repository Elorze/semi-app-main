import { getOwnedNFTs } from "thirdweb/extensions/erc721";
import { getContract } from "thirdweb";
import { createThirdwebClient } from "thirdweb";
import { defineChain } from "thirdweb";
import {useUserStore } from '~/stores/user';

/**
 * 获取指定ERC721合约的所有NFT
 * @returns Promise<Array<NFT>> - 返回NFT数组，最多100个
 */
export async function fetchNFTs() {
  const contractAddress = import.meta.env.VITE_ERC721_ADDRESS as string | undefined;
  const network = Number(import.meta.env.VITE_NETWORK);
  const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID as string | undefined;
  
  // 获取当前用户钱包地址
  const userStore = useUserStore();
  const user = userStore.user;
  // 真实使用返回当前用户地址
  const walletAddress = user?.evm_chain_address;

  // 开发测试使用固定 safe account
  // const walletAddress = '0x1B8c9A4057D9Ed35F8740fFbC96229aF43ACeE95';
  // const walletAddress = '0x0000000000000000000000000000000000000000';

  // 调试信息
  console.log('当前用户钱包地址：', walletAddress);
  console.log('🔍 环境变量调试信息:');
  console.log('VITE_ERC721_ADDRESS:', contractAddress);
  console.log('VITE_NETWORK:', import.meta.env.VITE_NETWORK);
  console.log('VITE_THIRDWEB_CLIENT_ID:', clientId);
  console.log('当前构建环境:', import.meta.env.MODE);
  
  if (!contractAddress) {
    throw new Error('VITE_ERC721_ADDRESS 环境变量未设置');
  }
  
  if (!network) {
    throw new Error('VITE_NETWORK 环境变量未设置');
  }
  
  if (!clientId) {
    throw new Error('VITE_THIRDWEB_CLIENT_ID 环境变量未设置');
  }
  
  try {
    // 创建client
    const client = createThirdwebClient({ clientId });
    const chain = defineChain(network);

    // 创建合约实例 - 使用简化的方式
    const contract = getContract({
      client,
      chain,
      address: contractAddress as `0x${string}`
    });
    
    const ownedNFTs = await getOwnedNFTs({
      contract,
      owner : walletAddress as string,
      // 不传start和count，获取所有NFT（最多100个）
    });
    
    return ownedNFTs;
  } catch (error) {
    console.error('获取NFT失败:', error);
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