import { createPublicClient, http, type Chain } from "viem"
import { createBundlerClient } from "viem/account-abstraction"
import { BUNDLER_URL, RPC_URL } from "../config"

export const prepareClient = async (chain: Chain) => {
    let bundlerUrl = BUNDLER_URL[chain.id]
    if (!bundlerUrl) {
        console.log('Unsupported chain: ', chain)
        throw new Error(`Unsupported chain: ${chain.name}`)
    }

    // 移除 URL 末尾的 /bundler，因为 viem 会自动添加
    if (bundlerUrl.endsWith('/bundler')) {
        bundlerUrl = bundlerUrl.replace('/bundler', '')
    }

    const publicClient = createPublicClient({
        chain,
        transport: http(RPC_URL[chain.id]),
    })

    const bundlerClient = createBundlerClient({
        chain,
        transport: http(bundlerUrl)
    })

    return {
        publicClient,
        bundlerClient
    }
}