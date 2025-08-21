<template>
    <div class="flex flex-col container-size rounded-xl bg-[var(--ui-bg)] shadow-lg p-4">
        <UButton icon="i-heroicons-arrow-left" color="neutral" variant="ghost" class="self-start mb-4"
            @click="router.push('/')">
            返回
        </UButton>
        <div class="flex flex-col items-center justify-center h-full gap-4 py-8 w-[80%] mx-auto">
            <h1 class="text-2xl font-bold">Safe Account 地址测试</h1>

            <div class="w-full space-y-4">
                <UButton @click="calculateAddress" :loading="loading" color="primary" class="w-full">
                    计算 Safe Account 地址
                </UButton>
                
                <UButton @click="findCorrectKey" :loading="loading" color="success" class="w-full">
                    查找正确的私钥
                </UButton>
                
                <UButton @click="generateCorrectSafeAddress" :loading="loading" color="primary" class="w-full">
                    生成正确的 Safe Account 地址
                </UButton>
                
                <UButton @click="generateRandomPrivateKey" :loading="loading" color="primary" class="w-full">
                    生成随机私钥
                </UButton>
                
                <UButton @click="verifyPrivateKeyAndAddress" :loading="loading" color="info" class="w-full">
                    验证私钥和地址对应关系
                </UButton>
                
                <div v-if="result" class="mt-4 p-4 bg-gray-100 rounded-lg">
                    <h3 class="font-bold mb-2">计算结果：</h3>
                    <pre class="text-sm">{{ result }}</pre>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { predictSafeAccountAddress } from '~/utils/SafeSmartAccount/account'
import { privateKeyToAccount } from 'viem/accounts'
import { formatEther } from 'viem'
import { prepareClient } from '~/utils/SafeSmartAccount/utils/prepareClient'

const router = useRouter()
const loading = ref(false)
const result = ref<{
    privateKey: string
    ownerAddress: string
    safeAddress: string
    message: string
} | null>(null)

// 计算地址
const calculateAddress = async () => {
    try {
        loading.value = true
        console.log('开始计算 Safe Account 地址...')
        
        const mockPrivateKeyAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
        const safeAddress = await predictSafeAccountAddress({
            owner: mockPrivateKeyAddress,
            chain: {
                id: 11155111, // Sepolia
                name: 'Sepolia',
                nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
                rpcUrls: { default: { http: ['https://sepolia.infura.io/v3/'] } }
            } as any
        })
        
        console.log('计算出的地址:', safeAddress)
        result.value = {
            privateKey: '0x1234567890123456789012345678901234567890',
            ownerAddress: mockPrivateKeyAddress,
            safeAddress,
            message: '计算完成！'
        }
    } catch (error) {
        console.error('计算失败:', error)
        result.value = {
            privateKey: '',
            ownerAddress: '',
            safeAddress: '',
            message: '计算失败: ' + (error as Error).message
        }
    } finally {
        loading.value = false
    }
}

// 查找正确的私钥
const findCorrectKey = async () => {
    try {
        loading.value = true
        console.log('开始查找正确的私钥...')
        
        const targetAddress = '0xD1876688526b55547deA80C503f28b5438c56372'
        
        // 测试一些常见的私钥
        const testPrivateKeys = [
            '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318',
            '0x1234567890123456789012345678901234567890123456789012345678901234',
            '0x0000000000000000000000000000000000000000000000000000000000000001',
        ]
        
        for (const privateKey of testPrivateKeys) {
            try {
                const account = privateKeyToAccount(privateKey as `0x${string}`)
                const calculatedAddress = await predictSafeAccountAddress({
                    owner: account.address,
                    chain: {
                        id: 11155111, // Sepolia
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
                    result.value = {
                        privateKey,
                        ownerAddress: account.address,
                        safeAddress: calculatedAddress,
                        message: '找到匹配的私钥！'
                    }
                    return
                }
            } catch (error) {
                console.log(`私钥 ${privateKey} 计算失败:`, error)
            }
        }
        
        console.log('❌ 未找到匹配的私钥')
        result.value = {
            privateKey: '',
            ownerAddress: '',
            safeAddress: '',
            message: '未找到匹配的私钥'
        }
    } catch (error) {
        console.error('查找失败:', error)
        result.value = {
            privateKey: '',
            ownerAddress: '',
            safeAddress: '',
            message: '查找失败: ' + (error as Error).message
        }
    } finally {
        loading.value = false
    }
}

// 生成正确的 Safe Account 地址
const generateCorrectSafeAddress = async () => {
    try {
        loading.value = true
        console.log('🔧 开始生成正确的 Safe Account 地址...')
        
        // 使用已知的私钥
        const privateKey = '0x1234567890123456789012345678901234567890' as `0x${string}`
        const account = privateKeyToAccount(privateKey)
        const ownerAddress = account.address
        
        console.log('私钥:', privateKey)
        console.log('普通地址:', ownerAddress)
        
        // 计算 Safe Account 地址
        const safeAddress = await predictSafeAccountAddress({
            owner: ownerAddress,
            chain: {
                id: 11155111, // Sepolia
                name: 'Sepolia',
                nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
                rpcUrls: { default: { http: ['https://sepolia.infura.io/v3/'] } }
            } as any
        })
        
        console.log('✅ 生成完成！')
        console.log('Safe Account 地址:', safeAddress)
        console.log('对应的私钥:', privateKey)
        console.log('对应的普通地址:', ownerAddress)
        
        // 更新结果
        result.value = {
            privateKey,
            ownerAddress,
            safeAddress,
            message: '生成成功！请使用这个地址获取测试币。'
        }
        
    } catch (error) {
        console.error('❌ 生成失败:', error)
        result.value = {
            privateKey: '',
            ownerAddress: '',
            safeAddress: '',
            message: '生成失败: ' + (error as Error).message
        }
    } finally {
        loading.value = false
    }
}

// 生成随机私钥
const generateRandomPrivateKey = async () => {
    try {
        loading.value = true
        console.log('🔧 开始生成随机私钥...')
        
        // 生成随机私钥
        const randomBytes = new Uint8Array(32)
        crypto.getRandomValues(randomBytes)
        
        // 转换为十六进制字符串
        const privateKey = '0x' + Array.from(randomBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
        
        console.log('生成的随机私钥:', privateKey)
        
        // 计算普通地址
        const account = privateKeyToAccount(privateKey as `0x${string}`)
        const ownerAddress = account.address
        
        console.log('普通地址:', ownerAddress)
        
        // 计算 Safe Account 地址
        const safeAddress = await predictSafeAccountAddress({
            owner: ownerAddress,
            chain: {
                id: 11155111, // Sepolia
                name: 'Sepolia',
                nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
                rpcUrls: { default: { http: ['https://sepolia.infura.io/v3/'] } }
            } as any
        })
        
        console.log('✅ 生成完成！')
        console.log('随机私钥:', privateKey)
        console.log('普通地址:', ownerAddress)
        console.log('Safe Account 地址:', safeAddress)
        
        // 更新结果
        result.value = {
            privateKey,
            ownerAddress,
            safeAddress,
            message: '随机私钥生成成功！请保存好私钥，然后向 Safe Account 地址发送测试币。'
        }
        
    } catch (error) {
        console.error('❌ 生成失败:', error)
        result.value = {
            privateKey: '',
            ownerAddress: '',
            safeAddress: '',
            message: '生成失败: ' + (error as Error).message
        }
    } finally {
        loading.value = false
    }
}

// 验证私钥和地址对应关系
const verifyPrivateKeyAndAddress = async () => {
    try {
        loading.value = true
        console.log('🔍 开始验证私钥和地址对应关系...')
        
        // 使用生成的私钥
        const privateKey = '0x1eab22ccc0e4e0f2f1430de7d12580481e4a5fefa15257449f2ef26284b090ab' as `0x${string}`
        
        // 1. 从私钥计算普通地址
        const account = privateKeyToAccount(privateKey)
        const calculatedOwnerAddress = account.address
        
        console.log('私钥:', privateKey)
        console.log('计算出的普通地址:', calculatedOwnerAddress)
        console.log('期望的普通地址:', '0xDce410f6BD8FD4dAa45026EDb8F8b0C2C9cc904e')
        console.log('普通地址是否匹配:', calculatedOwnerAddress.toLowerCase() === '0xDce410f6BD8FD4dAa45026EDb8F8b0C2C9cc904e'.toLowerCase())
        
        // 2. 从普通地址计算 Safe Account 地址
        const calculatedSafeAddress = await predictSafeAccountAddress({
            owner: calculatedOwnerAddress,
            chain: {
                id: 11155111, // Sepolia
                name: 'Sepolia',
                nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
                rpcUrls: { default: { http: ['https://sepolia.infura.io/v3/'] } }
            } as any
        })
        
        console.log('计算出的 Safe Account 地址:', calculatedSafeAddress)
        console.log('期望的 Safe Account 地址:', '0x1B8c9A4057D9Ed35F8740fFbC96229aF43ACeE95')
        console.log('Safe Account 地址是否匹配:', calculatedSafeAddress.toLowerCase() === '0x1B8c9A4057D9Ed35F8740fFbC96229aF43ACeE95'.toLowerCase())
        
        // 3. 检查余额
        const { publicClient } = await prepareClient({
            id: 11155111,
            name: 'Sepolia',
            nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: { default: { http: ['https://sepolia.infura.io/v3/'] } }
        } as any)
        
        const balance = await publicClient.getBalance({
            address: calculatedSafeAddress
        })
        
        console.log('Safe Account 余额:', balance)
        console.log('余额 (ETH):', Number(formatEther(balance)))
        
        // 更新结果
        const isOwnerAddressMatch = calculatedOwnerAddress.toLowerCase() === '0xDce410f6BD8FD4dAa45026EDb8F8b0C2C9cc904e'.toLowerCase()
        const isSafeAddressMatch = calculatedSafeAddress.toLowerCase() === '0x1B8c9A4057D9Ed35F8740fFbC96229aF43ACeE95'.toLowerCase()
        
        result.value = {
            privateKey,
            ownerAddress: calculatedOwnerAddress,
            safeAddress: calculatedSafeAddress,
            message: `验证结果：
普通地址匹配: ${isOwnerAddressMatch ? '✅' : '❌'}
Safe Account 地址匹配: ${isSafeAddressMatch ? '✅' : '❌'}
余额: ${Number(formatEther(balance))} ETH`
        }
        
    } catch (error) {
        console.error('❌ 验证失败:', error)
        result.value = {
            privateKey: '',
            ownerAddress: '',
            safeAddress: '',
            message: '验证失败: ' + (error as Error).message
        }
    } finally {
        loading.value = false
    }
}
</script>