import { type Address, type Chain, type PublicClient, parseEther, createWalletClient, http, createPublicClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { getSafeAccount, predictSafeAccountAddress } from './account'
import { prepareClient } from './utils/prepareClient'
import { erc20Abi } from 'viem'
import { getRpcUrl, getBundlerUrl } from './config'
import type { BundlerClient } from 'viem/account-abstraction'

type SmartAccount = Awaited<ReturnType<typeof getSafeAccount>>

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

// 获取 gas 价格
async function getGasPrice(chain:Chain){
    try{
        const gasPrice = await pimlicoGetUserOperationGasPrice(chain)
        console.log('[gasPrice]:',gasPrice)
        return gasPrice
    } catch(error){
        console.warn('⚠️ 获取 Gas 价格失败，使用默认设置:', error)
        return{
            maxFeePerGas: 30000000000n, // 30 gwei
            maxPriorityFeePerGas: 1500000000n, // 1.5 gwei
        }
    }
}

// 估算 gas
async function estimateGasWithPrice(
    bundlerClient: BundlerClient,
    smartAccount: SmartAccount,
    calls: readonly any[],
    chain: Chain
) {
    // 先获取 Gas 价格
    const gasPrice = await getGasPrice(chain)
    
            // 使用 gas 价格进行估算
            const gas = await bundlerClient.estimateUserOperationGas({
                account: smartAccount,
                calls,
                maxFeePerGas: gasPrice.maxFeePerGas,
                maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
            })
            
            console.log('[gas]:', gas)
            return { gas, gasPrice }
        
}

// gsa价格估算的辅助函数
async function applyGasPriceParams(
    params:any,
    chain:Chain,
    gas:{preVerificationGas: bigint; verificationGasLimit: bigint},
    gasPrice: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }
):Promise<any>{
    // 为 Sepolia和 Optimism 都添加 Gas 价格设置
    if (chain.id===10||chain.id===11155111){
            return{
                ...params,
                maxFeePerGas: gasPrice.maxFeePerGas,
                maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
                preVerificationGas: gas.preVerificationGas,
                verificationGasLimit: gas.verificationGasLimit,
            }
    }
    return params
}

// 发送 user operation
async function sendUserOperation(
    bundlerClient: BundlerClient,
    smartAccount: SmartAccount,
    calls: readonly any[],
    chain: Chain
){
    // 估算 gas（包含获取 gas 价格）
    const { gas, gasPrice } = await estimateGasWithPrice(bundlerClient, smartAccount, calls, chain)
    
    // 准备参数
    let params: any = {
        account: smartAccount,
        calls,
    }
    // 应用 gas 价格参数
    params = await applyGasPriceParams(params, chain, gas, gasPrice)
    
    // 发送 user operation
    const hash = await bundlerClient.sendUserOperation(params)
    console.log('[userOperation hash]:', hash)
    
    // 等待 receipt
    const receipt = await bundlerClient.waitForUserOperationReceipt({ hash })
    console.log('[userOperation receipt]:', receipt)
    
    return receipt
}

// 检查 Safe Account 部署状态的辅助函数
const checkSafeAccountDeployment = async (
    publicClient: PublicClient,
    smartAccountAddress: Address
): Promise<void> => {
    console.log('🔧 检查 Safe Account 部署状态...')
    console.log('Safe Account 地址:', smartAccountAddress)
    
    try {
        const code = await publicClient.getBytecode({
            address: smartAccountAddress
        })
        const isDeployed = code && code !== '0x'
        console.log('Safe Account 部署状态:', isDeployed ? '已部署' : '未部署')
        
        if (!isDeployed) {
            console.log('⚠️ Safe Account 未部署，将触发部署...')
        }
    } catch (error) {
        console.log('⚠️ 无法检查部署状态，假设未部署:', error)
    }
}

export const transfer = async ({ to, amount, privateKey, chain }: TransferOptions) => {
    const smartAccount = await getSafeAccount(privateKey, chain)
    const { bundlerClient, publicClient } = await prepareClient(chain)

    const tx = {
        to,
        value: parseEther(amount)
    } as const

    await checkSafeAccountDeployment(publicClient, smartAccount.address)
    console.log('[tx]:', tx)
    return await sendUserOperation(bundlerClient, smartAccount, [tx], chain)
}

export const transferErc20 = async ({ to, amount, privateKey, chain, erc20TokenAddress }: TransferOptions) => {
    if (!erc20TokenAddress) {
        throw new Error('erc20TokenAddress is required')
    }

    const smartAccount = await getSafeAccount(privateKey, chain)

    const { publicClient, bundlerClient } = await prepareClient(chain)

    await checkSafeAccountDeployment(publicClient, smartAccount.address)

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

    console.log('[tx]:', tx)
    return await sendUserOperation(bundlerClient, smartAccount, [tx], chain)
}