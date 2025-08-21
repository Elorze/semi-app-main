export default defineEventHandler(async (event) => {
    const {safeAddress, chainId, timezone} = getQuery(event) // 获取查询参数
    
    console.log('🔍 === Safe API 调试信息 ===')
    console.log('Safe Address:', safeAddress)
    console.log('Chain ID:', chainId)
    console.log('Timezone:', timezone)
    
    try {
        const result = await fetch(`https://safe-client.safe.global/v1/chains/${chainId}/safes/${safeAddress}/transactions/history?timezone=${timezone}&trusted=true&imitation=false`)
        
        console.log('API 响应状态:', result.status)
        console.log('API 响应头:', Object.fromEntries(result.headers.entries()))
        
        if (!result.ok) {
            const errorText = await result.text()
            console.error('Safe API 错误:', errorText)
            throw new Error(`Safe API 返回错误: ${result.status} - ${errorText}`)
        }
        
        const data = await result.json()
        console.log('Safe API 返回数据:', data)
        
        return data
    } catch (error) {
        console.error('Safe API 调用失败:', error)
        // 返回空数据而不是抛出错误，避免前端崩溃
        return {
            results: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
})