import { getOwnedNFTs as getOwnedNFTs721 } from "thirdweb/extensions/erc721";
import { getOwnedNFTs as getOwnedNFTs1155 } from "thirdweb/extensions/erc1155";
import { getContract } from "thirdweb";
import { createThirdwebClient } from "thirdweb";
import { defineChain } from "thirdweb";
import {useUserStore } from '~/stores/user';

/**
 * 获取指定ERC721和ERC1155合约的所有NFT
 * @returns Promise<Array<NFT>> - 返回NFT数组，最多100个
 */
export async function fetchNFTs() {
  const contractAddress721 = import.meta.env.VITE_ERC721_ADDRESS as string | undefined;
  const contractAddress1155 = import.meta.env.VITE_ERC1155_ADDRESS as string | undefined;
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

  // 检查用户是否已登录
  if (!walletAddress) {
    throw new Error('用户未登录或钱包地址未设置');
  }

  // 调试信息
  console.log('当前用户钱包地址：', walletAddress);
  console.log('🔍 环境变量调试信息:');
  console.log('VITE_ERC721_ADDRESS:', contractAddress721);
  console.log('VITE_ERC1155_ADDRESS:', contractAddress1155);
  console.log('VITE_NETWORK:', import.meta.env.VITE_NETWORK);
  console.log('VITE_THIRDWEB_CLIENT_ID:', clientId);
  console.log('当前构建环境:', import.meta.env.MODE);
  
  // 检查是否至少有一个合约地址
  if (!contractAddress721 && !contractAddress1155) {
    throw new Error('至少需要设置一个合约地址 (VITE_ERC721_ADDRESS 或 VITE_ERC1155_ADDRESS)');
  }
  
  if (!network) {
    throw new Error('VITE_NETWORK 环境变量未设置');
  }
  
  if (!clientId) {
    throw new Error('VITE_THIRDWEB_CLIENT_ID 环境变量未设置');
  }
  
  try {
    const client = createThirdwebClient({ clientId });
    const chain = defineChain(network);
    
    const allNFTs = [];
    
    // 获取ERC721 NFT
    if (contractAddress721) {
      console.log('正在获取ERC721 NFT...');
      const contract721 = getContract({
        client,
        chain,
        address: contractAddress721 as `0x${string}`
      });
      
      const nfts721 = await getOwnedNFTs721({
        contract: contract721,
        owner: walletAddress as string,
      });
      
      console.log('获取到ERC721 NFT数量:', nfts721.length);
      allNFTs.push(...nfts721);
    }
    
    // 获取ERC1155 NFT
    if (contractAddress1155) {
      console.log('正在获取ERC1155 NFT...');
      const contract1155 = getContract({
        client,
        chain,
        address: contractAddress1155 as `0x${string}`
      });
      
      const nfts1155 = await getOwnedNFTs1155({
        contract: contract1155,
        address: walletAddress as string,
      });
      
      console.log('获取到ERC1155 NFT数量:', nfts1155.length);
      allNFTs.push(...nfts1155);
    }
    
    console.log('总共获取到NFT数量:', allNFTs.length);
    return allNFTs;
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