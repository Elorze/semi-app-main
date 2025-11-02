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
        // const url = `https://proxy.ntdao.xyz/etherscan/v2/api?chainid=${chainId}&module=account&action=txlistinternal&address=${safeAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`
       
        const apiBase = 'https://proxy.ntdao.xyz/etherscan'
        // 1. 获取内部转账（原生代币 ETH）
        const internalUrl = `${apiBase}/v2/api?chainid=${chainId}&module=account&action=txlistinternal&address=${safeAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`
        
        // 2. 获取 ERC20 转账
        const tokenUrl = `${apiBase}/v2/api?chainid=${chainId}&module=account&action=tokentx&address=${safeAddress}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`
        
        console.log('请求 URL:', internalUrl.replace(apiKey || '', '***'))
        
         // 并行请求两个接口
         const [internalResult, tokenResult] = await Promise.all([
            fetch(internalUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(30000)
            }),
            fetch(tokenUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(30000)
            })
        ])
        
        const internalData = await internalResult.json()
        const tokenData = await tokenResult.json()
        
        console.log('原生币转账数量:', internalData.result?.length || 0)
        console.log('ERC20 转账数量:', tokenData.result?.length || 0)
        
         // 合并两种转账
         const allTransactions = [
            ...(internalData.result?.map((tx: any) => ({
                type: 'TRANSACTION',
                transaction: {
                    txInfo: {
                        type: 'Transfer',
                        sender: { value: tx.from },
                        recipient: { value: tx.to },
                        transferInfo: {
                            type: 'NATIVE_COIN',
                            value: tx.value,
                            tokenSymbol: 'ETH' // 原生币
                        }
                    },
                    timestamp: parseInt(tx.timeStamp) * 1000,
                    txStatus: tx.isError === '0' ? 'SUCCESS' : 'FAILED',
                    txHash: tx.hash,
                }
            })) || []),
            ...(tokenData.result?.map((tx: any) => ({
                type: 'TRANSACTION',
                transaction: {
                    txInfo: {
                        type: 'Transfer',
                        sender: { value: tx.from },
                        recipient: { value: tx.to },
                        transferInfo: {
                            type: 'ERC20',
                            value: tx.value,
                            tokenSymbol: tx.tokenSymbol, // ERC20 代币符号
                            tokenName: tx.tokenName,
                            tokenAddress: tx.contractAddress
                        }
                    },
                    timestamp: parseInt(tx.timeStamp) * 1000,
                    txStatus: (tx.isError === undefined || tx.isError === '0') ? 'SUCCESS' : 'FAILED',
                    txHash: tx.hash,
                }
            })) || [])
        ]

        // 按时间戳排序
        allTransactions.sort((a, b) => b.transaction.timestamp - a.transaction.timestamp)
        
        console.log('✅ 转换后的数据，总数:', allTransactions.length)
        return {
            count: allTransactions.length,
            results: allTransactions
        }
        // ✅ 转换 Etherscan 格式为前端期望的 Safe 格式
        // Etherscan 返回格式: { status, message, result: [...] }
        // Safe 格式: { count, results: [{ type: 'TRANSACTION', transaction: {...} }] }
       

    } catch (error) {
        console.error('Safe API 调用失败:', error)
        // 返回空数据而不是抛出错误，避免前端崩溃
        return {
            results: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
})