import { POPULAR_ERC20_TOKENS, type TokenMetadata } from './tokens'
import {createPublicClient, http, type Address, type Chain, erc20Abi} from 'viem'
import { RPC_URL } from '~/utils/SafeSmartAccount/config'

// 检测是否是 Safe Account 地址
const isSafeAccount = (address: Address): boolean => {
    // 这里可以根据地址特征判断，暂时简单判断
    // Safe Account 地址通常是合约地址，可以通过检查合约代码来判断
    return true // 暂时假设都是 Safe Account
}

export async function getBalance(address: Address, chain: Chain) {
    const client = createPublicClient({
        chain,
        transport: http(RPC_URL[chain.id])
    })
    
    // 直接查询余额，不管是普通地址还是 Safe Account
    const balance = await client.getBalance({address})
    return balance
}

export async function getErc20Balance(address: Address, tokenAddress: Address, chain: Chain) {
    const client = createPublicClient({
        chain,
        transport: http(RPC_URL[chain.id])
    })
    const balance = await client.readContract({
        address: tokenAddress, 
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address]
    })

    return balance
}


export interface ERC20Balance {
    token: TokenMetadata
    balance: bigint
}

export async function getPopularERC20Balance(address: Address, chain: Chain): Promise<ERC20Balance[]> {
    const client = createPublicClient({
        chain,
        transport: http(RPC_URL[chain.id])
    })

    const tokens = POPULAR_ERC20_TOKENS[chain.id]
    
    const balances = await Promise.all(tokens.map(async (token) => {
        const balance = await client.readContract({
            address: token.address as `0x${string}`, 
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address]
        })
        return {
            token,
            balance
        }
    }))

    return balances 
}