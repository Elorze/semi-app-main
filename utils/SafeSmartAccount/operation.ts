import { type Address, type Chain, parseEther, createWalletClient, http, createPublicClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { getSafeAccount, predictSafeAccountAddress } from './account'
import { prepareClient } from './utils/prepareClient'
import { erc20Abi } from 'viem'
import { getRpcUrl, getBundlerUrl } from './config'

export interface TransferOptions {
    to: Address
    amount: string,
    erc20TokenAddress?: Address
    privateKey: `0x${string}`
    chain: Chain
}

// 普通地址转账函数
export const normalTransfer = async ({ to, amount, privateKey, chain }: TransferOptions) => {
    const account = privateKeyToAccount(privateKey)
    
    const client = createWalletClient({
        account,
        chain,
        transport: http(getRpcUrl(chain.id))
    })

    const publicClient = createPublicClient({
        chain,
        transport: http(getRpcUrl(chain.id))
    })

    const hash = await client.sendTransaction({
        to,
        value: parseEther(amount)
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    return receipt
}

// 普通地址 ERC20 转账函数
export const normalTransferErc20 = async ({ to, amount, privateKey, chain, erc20TokenAddress }: TransferOptions) => {
    if (!erc20TokenAddress) {
        throw new Error('erc20TokenAddress is required')
    }

    const account = privateKeyToAccount(privateKey)
    
    const client = createWalletClient({
        account,
        chain,
        transport: http(getRpcUrl(chain.id))
    })

    const publicClient = createPublicClient({
        chain,
        transport: http(getRpcUrl(chain.id))
    })

    const decimals = await publicClient.readContract({
        address: erc20TokenAddress,
        abi: erc20Abi,
        functionName: 'decimals',
    })

    const amountWithDecimals = BigInt(Number(amount) * 10 ** decimals)

    const hash = await client.writeContract({
        address: erc20TokenAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [to, amountWithDecimals]
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    return receipt
}

// 检测地址类型
export const getAddressType = (address: Address, chain: Chain): 'safe' | 'normal' => {
    // 这里可以根据地址特征判断
    // 暂时简单判断：如果地址是 Mock 地址，则认为是普通地址
    if (address === '0xdE321219C32E330eB6AB8d310de02Ab4E5B62DA2') {
        return 'normal'
    }
    return 'safe'
}

export const transfer = async ({ to, amount, privateKey, chain }: TransferOptions) => {
    const smartAccount = await getSafeAccount(privateKey, chain)

    const { bundlerClient, publicClient } = await prepareClient(chain)

    const tx = {
        to,
        value: parseEther(amount)
    } as const

    // 测试阶段：检查 Safe Account 部署状态
    console.log('🔧 检查 Safe Account 部署状态...')
    console.log('Safe Account 地址:', smartAccount.address)
    
    // 检查 Safe Account 是否已部署（通过查询合约代码）
    try {
        const code = await publicClient.getBytecode({
            address: smartAccount.address
        })
        const isDeployed = code && code !== '0x'
        console.log('Safe Account 部署状态:', isDeployed ? '已部署' : '未部署')
        
        if (!isDeployed) {
            console.log('⚠️ Safe Account 未部署，将触发部署...')
        }
    } catch (error) {
        console.log('⚠️ 无法检查部署状态，假设未部署:', error)
    }
    
    // 展：pimlico要求，先获取gas价格
    const gasPrice = await pimlicoGetUserOperationGasPrice(chain)
    const gas = await bundlerClient.estimateUserOperationGas({
        account: smartAccount,
        calls: [tx],
        maxFeePerGas: gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
    })


    console.log('[tx]:', tx)
    // const gas = await bundlerClient.estimateUserOperationGas({
    //     account: smartAccount,
    //     calls: [tx]
    // })

    console.log('[gas]:', gas)

    let params: any = {
        account: smartAccount,
        calls: [tx],
    }

    // 为 Sepolia 和 Optimism 都添加 Gas 价格设置
    if (chain.id === 10 || chain.id === 11155111) {
        try {
            // 测试阶段：使用简单的 Gas 价格设置
            // 生产阶段：恢复使用 pimlicoGetUserOperationGasPrice
            const baseFee = await publicClient.getBlock({ blockTag: 'latest' }).then(block => block.baseFeePerGas)
            const maxPriorityFeePerGas = 1500000000n // 1.5 gwei
            const maxFeePerGas = (baseFee || 20000000000n) * 2n + maxPriorityFeePerGas
            
            console.log('[gasPrice]:', { maxFeePerGas, maxPriorityFeePerGas })
            params = {
                ...params,
                // maxFeePerGas,
                // maxPriorityFeePerGas,
                // 展
                maxFeePerGas: gasPrice.maxFeePerGas,
                maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
                preVerificationGas: gas.preVerificationGas,
                verificationGasLimit: gas.verificationGasLimit,
            }
            
            /* 生产阶段恢复使用原来的 Gas 价格获取方式
            const gasPrice = await pimlicoGetUserOperationGasPrice(chain)
            console.log('[gasPrice]:', gasPrice)
            params = {
                ...params,
                maxFeePerGas: gasPrice.maxFeePerGas,
                maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
                preVerificationGas: gas.preVerificationGas,
                verificationGasLimit: gas.verificationGasLimit,
            }
            */
        } catch (error) {
            console.warn('⚠️ 获取 Gas 价格失败，使用默认设置:', error)
            // 使用默认 Gas 价格
            params = {
                ...params,
                maxFeePerGas: 30000000000n, // 30 gwei
                maxPriorityFeePerGas: 1500000000n, // 1.5 gwei
                preVerificationGas: gas.preVerificationGas,
                verificationGasLimit: gas.verificationGasLimit,
            }
        }
    }

    const hash = await bundlerClient.sendUserOperation(params)

    console.log('[userOperation hash]:', hash)

    const receipt = await bundlerClient.waitForUserOperationReceipt({ hash })

    return receipt
}

export const transferErc20 = async ({ to, amount, privateKey, chain, erc20TokenAddress }: TransferOptions) => {
    if (!erc20TokenAddress) {
        throw new Error('erc20TokenAddress is required')
    }

    const smartAccount = await getSafeAccount(privateKey, chain)

    const { publicClient, bundlerClient } = await prepareClient(chain)

    const decimals = await publicClient.readContract({
        address: erc20TokenAddress,
        abi: erc20Abi,
        functionName: 'decimals',
    })

    const amountWithDecimals = BigInt(Number(amount) * 10 ** decimals)

    const tx = {
        abi: erc20Abi,
        functionName: 'transfer',
        args: [to, amountWithDecimals],
        to: erc20TokenAddress,
    } as const

    const gas = await bundlerClient.estimateUserOperationGas({
        account: smartAccount,
        calls: [tx]
    })

    console.log('[gas]:', gas)

    let params: any = {
        account: smartAccount,
        calls: [tx],
    }

    if (chain.id === 10) {
        const gasPrice = await pimlicoGetUserOperationGasPrice(chain)
        console.log('[gasPrice]:', gasPrice)
        params = {
            ...params,
            maxFeePerGas: gasPrice.maxFeePerGas,
            maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
            preVerificationGas: gas.preVerificationGas,
            verificationGasLimit: gas.verificationGasLimit,
        }
    }

    const hash = await bundlerClient.sendUserOperation(params)

    console.log('[userOperation hash]:', hash)

    const receipt = await bundlerClient.waitForUserOperationReceipt({ hash })

    console.log('[userOperation receipt]:', receipt)

    return receipt
}

export const pimlicoGetUserOperationGasPrice = async (chain: Chain) => {
    const response = await fetch(`${getBundlerUrl(chain.id)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "jsonrpc": "2.0",
            "method": "pimlico_getUserOperationGasPrice",
            "params": [],
            "id": 1
        })
    })

    const data = await response.json()

    console.log('[pimlicoGetUserOperationGasPrice]:', data)

    return {
        maxFeePerGas: BigInt(data.result.standard.maxFeePerGas),
        maxPriorityFeePerGas: BigInt(data.result.standard.maxPriorityFeePerGas),
    }
}