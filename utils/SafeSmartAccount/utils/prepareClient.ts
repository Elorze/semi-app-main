import { createPublicClient, http, type Chain } from "viem"
import { createBundlerClient } from "viem/account-abstraction"
import { getBundlerUrl, getRpcUrl } from "../config"

export const prepareClient = async (chain: Chain) => {
    let bundlerUrl = getBundlerUrl(chain.id)
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
        transport: http(getRpcUrl(chain.id)),
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