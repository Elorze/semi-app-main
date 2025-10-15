export default defineEventHandler(async (event) => {
    const {safeAddress, chainId, timezone} = getQuery(event)
    
    console.log('🔍 === Safe API 调试信息 ===')
    console.log('Safe Address:', safeAddress)
    console.log('Chain ID:', chainId, typeof chainId)
    console.log('Timezone:', timezone)
    
    
    try {
        // 这个不知道为什么查不到交易数据，换了一个etherscan的 const url = `https://safe-client.safe.global/v1/chains/${chainId}/safes/${safeAddress}/transactions/history?timezone=${timezone}&trusted=true&imitation=false`
        const url = `https://api-optimistic.etherscan.io/api?module=account&action=txlist&address=${safeAddress}&startblock=0&endblock=99999999&sort=desc`
        console.log('请求 URL:', url)
        
        const result = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Referer': 'https://app.safe.global/',
            },
            signal: AbortSignal.timeout(30000)
        })
        
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