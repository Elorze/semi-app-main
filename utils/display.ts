import { formatUnits } from 'viem'
import bignumber from 'bignumber.js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)


export function formatAddress(address: string) {
    return address.slice(0, 6) + '...' + address.slice(-4)
}

export function displayBalance(wei: bigint, fixed=4, decimals=18) {
    const value = formatUnits(wei, decimals)
    const str =  new bignumber(value).toFormat(fixed, 1)
    // remove trailing zeros
    return str.replace(/\.?0+$/, '')
}

export interface ActionPreview {
    from: string
    to: string
    value: bigint
    date: string,
    status: string,
    direction: string,
    token: string | 'NATIVE_COIN'
    type: string
    txHex: string
    symbol?: string
    decimals?: number
}

export function parseActions(history: any[]) {
    const actions: ActionPreview[] = []
    
    // 展：过滤掉 entrypoint 系统调用的 0 ETH
    // EntryPoint 合约地址 (ERC-4337 v0.7) - 用于过滤系统级调用
    const ENTRY_POINT_ADDRESS = '0x0000000071727de22e5e9d8baf0edac6f37da032'

    // 添加安全检查
    if (!history || !Array.isArray(history)) {
        console.warn('parseActions: history 不是有效的数组', history)
        return actions
    }
    
    history
    .filter((item) => {
        if (item.type !== 'TRANSACTION' || item.transaction.txInfo.type === 'Creation'){
            return false
        }

        // 展：过滤掉发送到 EntryPoint 的 0 ETH 交易 （ERC-4377 系统级操作）
        const recipient = item.transaction.txInfo.recipient.value.toLowerCase()
        const value = item.transaction.txInfo.transferInfo.value
       
        const isEntryPointCall = recipient === ENTRY_POINT_ADDRESS.toLowerCase()
        
        if (isEntryPointCall) {
            console.log('🚫 过滤 EntryPoint 系统调用:', item.transaction.txHash)
            return false
        }
        
        return true
    })
    .forEach((item) => {
        console.log('item', item)
        actions.push({
            from: item.transaction.txInfo.sender.value,
            to: item.transaction.txInfo.recipient.value,
            value: item.transaction.txInfo.transferInfo.value,
            date: item.transaction.timestamp,
            status: item.transaction.txStatus,
            direction: item.transaction.direction,
            token: item.transaction.txInfo.transferInfo.type,
            type: item.transaction.txInfo.type,
            txHex: item.transaction.txHash,
            symbol: item.transaction.txInfo.transferInfo.tokenSymbol,
            decimals: item.transaction.txInfo.transferInfo.decimals,
        })
    })

    return actions
}

export function displayDate(date: string) {
    return dayjs(date).fromNow()
}
