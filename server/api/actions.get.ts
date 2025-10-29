export default defineEventHandler(async (event) => {
    const {safeAddress, chainId, timezone} = getQuery(event)

    const apiKey = process.env.OPTIMISTIC_ETHERSCAN_API_KEY
    
    console.log('🔍 === Etherscan API 调试信息 ===')
    console.log('Safe Address:', safeAddress)
    console.log('Chain ID:', chainId, typeof chainId)
    console.log('Timezone:', timezone)
    console.log('API Key 状态:', apiKey ? '✅ 已配置' : '❌ 未配置')
    
    try {
        // ❌ 旧 API：Safe Transaction Service 不支持通过 ERC-4337 模块执行的交易
        // const encodedTimezone = timezone ? encodeURIComponent(timezone as string) : 'UTC'
        // const url = `https://safe-client.safe.global/v1/chains/${chainId}/safes/${safeAddress}/transactions/history?timezone=${encodedTimezone}&trusted=true&imitation=false`
        
        // ✅ 新 API：使用 Etherscan API 查询内部交易（包括模块交易）
        const url = `https://proxy.ntdao.xyz/etherscan/v2/api?chainid=${chainId}&module=account&action=txlistinternal&address=${safeAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`
        console.log('请求 URL:', url.replace(apiKey || '', '***'))
        
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
        console.log('Etherscan API 原始返回数据:', data)
        console.log('返回交易数量:', data.result?.length || 0)
        
        // ✅ 转换 Etherscan 格式为前端期望的 Safe 格式
        // Etherscan 返回格式: { status, message, result: [...] }
        // Safe 格式: { count, results: [{ type: 'TRANSACTION', transaction: {...} }] }
        const transformedData = {
            count: data.result?.length || 0,
            results: data.result?.map((tx: any) => ({
                type: 'TRANSACTION',
                transaction: {
                    txInfo: {
                        type: 'Transfer',
                        sender: { value: tx.from },
                        recipient: { value: tx.to },
                        transferInfo: {
                            type: 'NATIVE_COIN',
                            value: tx.value
                        }
                    },
                    timestamp: parseInt(tx.timeStamp) * 1000, // Etherscan 返回秒，需转换为毫秒
                    txStatus: tx.isError === '0' ? 'SUCCESS' : 'FAILED',
                    txHash: tx.hash,
                }
            })) || []
        }
        
        console.log('✅ 转换后的数据:', transformedData)
        return transformedData
        
        // ❌ 旧代码：直接返回原始数据（格式不兼容前端）
        // return data
        
    } catch (error) {
        console.error('Safe API 调用失败:', error)
        // 返回空数据而不是抛出错误，避免前端崩溃
        return {
            results: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
})