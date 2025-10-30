import { toSafeSmartAccount } from 'permissionless/accounts'
import { predictSafeSmartAccountAddress } from './utils'
import { privateKeyToAccount } from 'viem/accounts'
import { type Chain } from 'viem/chains'
import { http, createPublicClient, type Address } from 'viem'
import { V1_4_1_DEPLOYMENTS } from './config'
import { entryPoint07Address } from 'viem/account-abstraction'
import { getRpcUrl } from './config'

export const getSafeAccount = async (privateKey: `0x${string}`, chain: Chain) => {
    const deployment = V1_4_1_DEPLOYMENTS[chain.id]
    if (!deployment) throw new Error(`Deployment for chain ${chain.name} not found`)

    // 测试阶段：使用正确的私钥，恢复正常的部署逻辑
    // 开发阶段：继续使用正常的 Safe Account 计算
    console.log('🔧 使用正确的私钥创建 Safe Account...')
    console.log('私钥:', privateKey)
    
    const owner = privateKeyToAccount(privateKey)
    console.log('所有者地址:', owner.address)

    const client = createPublicClient({
        chain,
        transport: http(getRpcUrl(chain.id)),
    })

    try {
        console.log('开始创建 Safe Account...')
        
        // 恢复正常的 Safe Account 创建逻辑
        const account = await toSafeSmartAccount({
            client,
            entryPoint: {
                address: entryPoint07Address,
                version: "0.7"
            },
            owners: [owner],
            version: "1.4.1",
            safeProxyFactoryAddress: '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67',
            safeSingletonAddress: '0x41675C099F32341bf84BFc5382aF534df5C7461a',
            multiSendAddress: '0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526',
            multiSendCallOnlyAddress: '0x9641d764fc13c8B624c04430C7356C1C7C8102e2'
        })

        console.log('✅ Safe Account 创建成功，地址:', account.address)
        console.log('部署信息已包含在 account 对象中')


        return account
        
    } catch (error) {
        console.error('❌ Safe Account 创建失败:', error)
        throw new Error(`Safe Account 创建失败: ${(error as Error).message}`)
    }
}

export const predictSafeAccountAddress = async ({
    owner,
    chain
}: {
    owner: Address
    chain: Chain
}): Promise<Address> => {

    const deployment = V1_4_1_DEPLOYMENTS[chain.id]
    if (!deployment) throw new Error(`Deployment for chain ${chain.name} not found`)

    const client = createPublicClient({
        chain,
        transport: http(getRpcUrl(chain.id)),
    })

    const address = await predictSafeSmartAccountAddress({
        client,
        owners: [owner],
        version: '1.4.1',
        entryPoint: {
            address: entryPoint07Address,
            version: "0.7"
        },
        safeProxyFactoryAddress: '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67',
        safeSingletonAddress: '0x41675C099F32341bf84BFc5382aF534df5C7461a',
        multiSendAddress: '0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526',
        multiSendCallOnlyAddress: '0x9641d764fc13c8B624c04430C7356C1C7C8102e2'
    })
    return address
}

// 计算真实的 Safe Account 地址（用于 Mock 数据）
export const calculateMockSafeAddress = async (): Promise<{ safeAddress: string; privateKeyAddress: string }> => {
    try {
        // 使用 Mock 私钥地址
        const mockPrivateKeyAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
        
        console.log('开始计算 Safe Account 地址...')
        console.log('所有者地址:', mockPrivateKeyAddress)
        
        // 计算真实的 Safe Account 地址
        const safeAddress = await predictSafeAccountAddress({
            owner: mockPrivateKeyAddress,
            chain: {
                id: 11155111, // Sepolia
                name: 'Sepolia',
                nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
                rpcUrls: { default: { http: ['https://sepolia.infura.io/v3/'] } }
            } as any
        })
        
        console.log('✅ 计算完成！')
        console.log('真实的 Safe Account 地址:', safeAddress)
        console.log('Mock 私钥地址:', mockPrivateKeyAddress)
        
        return {
            safeAddress,
            privateKeyAddress: mockPrivateKeyAddress
        }
    } catch (error) {
        console.error('❌ 计算失败:', error)
        throw error
    }
}

// 测试函数：找到能计算出正确地址的私钥
export const findCorrectPrivateKey = async (targetAddress: string): Promise<string | null> => {
    console.log('🔍 开始查找能计算出正确地址的私钥...')
    console.log('目标地址:', targetAddress)
    
    // 测试一些常见的私钥
    const testPrivateKeys = [
        '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318',
        '0x1234567890123456789012345678901234567890123456789012345678901234',
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        '0x0000000000000000000000000000000000000000000000000000000000000002',
        '0x0000000000000000000000000000000000000000000000000000000000000003',
    ]
    
    for (const privateKey of testPrivateKeys) {
        try {
            const account = privateKeyToAccount(privateKey as `0x${string}`)
            const calculatedAddress = await predictSafeAccountAddress({
                owner: account.address,
                chain: {
                    id: 11155111,
                    name: 'Sepolia',
                    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
                    rpcUrls: { default: { http: ['https://sepolia.infura.io/v3/'] } }
                } as any
            })
            
            console.log(`私钥: ${privateKey}`)
            console.log(`计算出的地址: ${calculatedAddress}`)
            console.log(`是否匹配: ${calculatedAddress.toLowerCase() === targetAddress.toLowerCase()}`)
            
            if (calculatedAddress.toLowerCase() === targetAddress.toLowerCase()) {
                console.log('✅ 找到匹配的私钥！')
                return privateKey
            }
        } catch (error) {
            console.log(`私钥 ${privateKey} 计算失败:`, error)
        }
    }
    
    console.log('❌ 未找到匹配的私钥')
    return null
}