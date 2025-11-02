<template>
    <div class="flex flex-col container-size h-[100vh] rounded-xl bg-[var(--ui-bg)] shadow-lg px-4 sm:px-8 py-8 banner">
        <UButton icon="i-heroicons-arrow-left" color="neutral" variant="ghost" class="self-start mb-4"
            @click="router.push('/')">
            返回
        </UButton>

        <h1 class="text-2xl font-bold mb-4">活动记录</h1>

        <div class="flex flex-col gap-4" v-if="actions.length === 0 && !loading">
            <div class="text-gray-400 text-sm">当前没有数据</div>
        </div>

        <!-- 加载动画 -->
        <div class="flex flex-col gap-4" v-if="loading">
            <div class="w-full h-10 rounded-lg loading-bg"></div>
            <div class="w-80 h-10 rounded-lg loading-bg"></div>
            <div class="w-full h-10 rounded-lg loading-bg"></div>
            <div class="w-80 h-10 rounded-lg loading-bg"></div>
            <div class="w-full h-10 rounded-lg loading-bg"></div>
        </div>

        <!-- 活动记录列表 -->
        <div class="flex-1 overflow-y-auto flex flex-col gap-4">
            <div class="flex items-center gap-2 justify-between hover:bg-muted p-2 rounded-lg cursor-pointer"
                v-for="(action, index) in actions" :key="index" @click="toExplorer(action.txHex)">
                <div class="flex flex-row gap-2">
                    <div class="flex flex-col">
                        <div class="font-medium">
                            <span v-if="isSent(action)">To: {{ formatAddress(action.to) }}</span>
                            <span v-else>From: {{ formatAddress(action.from) }}</span>
                        </div>
                        <div class="text-gray-400 text-sm flex flex-row gap-1 items-center" v-if="action.token === 'NATIVE_COIN'">
                            <div>{{ displayBalance(action.value, 6, 18) }} {{ useChain.chain.nativeCurrency.symbol }}</div>
                        </div>
                        <div class="text-gray-400 text-sm" v-else> 
                            {{ displayBalance(action.value, 6, action.decimals) }} {{ action.symbol }}
                        </div>
                    </div>
                </div>

                <div class="flex flex-col gap-2 items-end">
                    <div class="text-gray-400 text-sm">{{ displayDate(action.date) }}</div>
                    <div class="text-gray-400 text-sm">{{ action.status }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useUserStore } from '../stores/user'
import { useChainStore } from '../stores/chain'
import type { Chain } from 'viem'
import { parseActions, formatAddress, displayDate, displayBalance } from '../utils/display'

const userStore = useUserStore()
const user = computed(() => userStore.user)
const loading = ref(false)
const useChain = useChainStore()
const actions = ref<ActionPreview[]>([])

const router = useRouter()

const toExplorer = (tx: string) => {
    const url = useChain.chain.blockExplorers?.default?.url
    window.open(`${url}/tx/${tx}`, '_blank')
}

const isSent = (action: ActionPreview) => {
    const userAddress = user.value?.evm_chain_address?.toLowerCase()
    return action.from.toLowerCase() === userAddress
}

onMounted(async () => {
    console.log('🔍 === 活动记录页面加载 ===')
    console.log('用户信息:', user.value)
    console.log('用户地址:', user.value?.evm_chain_address)
    console.log('链信息:', useChain.chain)
    
    const updateRecipients = async (chain: Chain, safeAddress: string) => {
        console.log('🔍 === 开始获取活动记录 ===')
        console.log('Chain:', chain.name, chain.id)
        console.log('Safe Address:', safeAddress)
        
        loading.value = true
        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
            console.log('Timezone:', timezone)
            
            const url = `/api/actions?safeAddress=${safeAddress}&chainId=${chain.id}&timezone=${timezone}`
            console.log('请求 URL:', url)
            console.log('开始发送请求...')
            
            // 展：简单的超时 + 重试逻辑
            let result: Response
            let lastError: Error | null = null
            
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    console.log(`�� 请求尝试 ${attempt + 1}/3`)
                    
                    const controller = new AbortController()
                    const timeoutId = setTimeout(() => controller.abort(), 30000)
                    
                    result = await fetch(url, { signal: controller.signal })
                    clearTimeout(timeoutId)
                    
                    console.log('响应状态:', result.status)
                    break
                    
                } catch (error) {
                    lastError = error as Error
                    console.error(`❌ 尝试 ${attempt + 1} 失败:`, error)
                    
                    if (attempt < 2) {
                        console.log('⏳ 等待1秒后重试...')
                        await new Promise(resolve => setTimeout(resolve, 1000))
                    }
                }
            }
            
            if (!result!) {
                throw lastError || new Error('请求失败')
            }
            
            console.log('响应头:', Object.fromEntries(result.headers.entries()))
            
            if (!result.ok) {
                console.error('请求失败，状态码:', result.status)
                const errorText = await result.text()
                console.error('错误内容:', errorText)
            }
            
            const resultData = await result.json()
            console.log('原始响应数据:', resultData)
            console.log('解析后的活动记录:', parseActions(resultData.results))
            
            actions.value = parseActions(resultData.results)
            console.log('活动记录数量:', actions.value.length)
            
        } catch (error) {
            console.error('获取活动记录失败:', error)
            console.error('错误详情:', (error as Error).message)
            console.error('错误堆栈:', (error as Error).stack)
            throw error
        } finally {
            loading.value = false
            console.log('加载完成')
        }
    }

    if (user.value?.evm_chain_address) {
        console.log('用户有地址，开始获取活动记录')
        updateRecipients(useChain.chain, user.value?.evm_chain_address!)
    } else {
        console.log('❌ 用户没有地址，无法获取活动记录')
        console.log('用户数据:', user.value)
    }
})
</script>
