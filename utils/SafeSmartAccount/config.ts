import type { Address } from "viem"

interface Deployment {
    [key: number]: {
        compatibility_fallback_handler: Address
        create_call: Address
        multi_send: Address
        multi_send_call_only: Address
        safe: Address
        safe_l2: Address
        safe_migration: Address
        safe_proxy_factory: Address
        safe_to_l2_migration: Address
        safe_to_l2_setup: Address
        sign_message_lib: Address
        simulate_tx_accessor: Address
        safe_4337_module: Address
        add_module_lib: Address
    }
}

export interface BundlerUrl {
    [key: number]: string
}

export interface RPCUrl {
    [key: number]: string
}

// 测试阶段：只支持 Sepolia 测试网
// 开发阶段：可以取消注释添加 Optimism 主网支持
export const SUPPORTED_CHAINS = [11155111] as const

export const V1_4_1_DEPLOYMENTS: Deployment = {
    // 测试阶段：注释掉 Optimism 主网配置
    // 开发阶段：取消注释以支持 Optimism 主网
    /*
    10: {
        compatibility_fallback_handler: '0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99',
        create_call: '0x9b35Af71d77eaf8d7e40252370304687390A1A52',
        multi_send: '0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526',
        multi_send_call_only: '0x9641d764fc13c8B624c04430C7356C1C7C8102e2',
        safe: '0x41675C099F32341bf84BFc5382aF534df5C7461a',
        safe_l2: '0x29fcB43b46531BcA003ddC8FCB67FFE91900C762',
        safe_migration: '0x526643F69b81B008F46d95CD5ced5eC0edFFDaC6',
        safe_proxy_factory: '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67',
        safe_to_l2_migration: '0xfF83F6335d8930cBad1c0D439A841f01888D9f69',
        safe_to_l2_setup: '0xBD89A1CE4DDe368FFAB0eC35506eEcE0b1fFdc54',
        sign_message_lib: '0xd53cd0aB83D845Ac265BE939c57F53AD838012c9',
        simulate_tx_accessor: '0x3d4BA2E0884aa488718476ca2FB8Efc291A46199',
        safe_4337_module: '0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226',
        add_module_lib: '0x8EcD4ec46D4D2a6B64fE960B3D64e8B94B2234eb',
    },
    */
    
    // 测试阶段：使用标准 Sepolia 测试网
    // 开发阶段：可以继续使用或切换到其他测试网
    11155111: {
        compatibility_fallback_handler: '0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99',
        create_call: '0x9b35Af71d77eaf8d7e40252370304687390A1A52',
        multi_send: '0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526',
        multi_send_call_only: '0x9641d764fc13c8B624c04430C7356C1C7C8102e2',
        safe: '0x41675C099F32341bf84BFc5382aF534df5C7461a',
        safe_l2: '0x29fcB43b46531BcA003ddC8FCB67FFE91900C762',
        safe_migration: '0x526643F69b81B008F46d95CD5ced5eC0edFFDaC6',
        safe_proxy_factory: '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67',
        safe_to_l2_migration: '0xfF83F6335d8930cBad1c0D439A841f01888D9f69',
        safe_to_l2_setup: '0xfF83F6335d8930cBad1c0D439A841f01888D9f69',
        sign_message_lib: '0xd53cd0aB83D845Ac265BE939c57F53AD838012c9',
        simulate_tx_accessor: '0x3d4BA2E0884aa488718476ca2FB8Efc291A46199',
        safe_4337_module: '0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226',
        add_module_lib: '0x8EcD4ec46D4D2a6B64fE960B3D64e8B94B2234eb',
    }
}

// ========== 详细的环境变量调试信息 ==========
console.log('🔍 === ZeroDev 环境变量调试信息 ===')
console.log('📡 VITE_SEPOLIA_BUNDLER_URL:', import.meta.env.VITE_SEPOLIA_BUNDLER_URL)
console.log('🌐 VITE_SEPOLIA_RPC_URL:', import.meta.env.VITE_SEPOLIA_RPC_URL)
console.log('🔑 VITE_INFURA_API_KEY:', import.meta.env.VITE_INFURA_API_KEY ? '已设置' : '未设置')
console.log('📁 当前环境:', import.meta.env.MODE)
console.log('=====================================')

// 检查环境变量是否包含 your_project_id
const sepoliaBundlerUrl = import.meta.env.VITE_SEPOLIA_BUNDLER_URL

if (sepoliaBundlerUrl && sepoliaBundlerUrl.includes('your_project_id')) {
    console.error('❌ VITE_SEPOLIA_BUNDLER_URL 包含占位符 your_project_id，请检查 .env 文件')
}

if (!sepoliaBundlerUrl) {
    console.error('❌ 环境变量未设置，请检查 .env 文件')
}

// 测试阶段：只配置 Sepolia 测试网
// 开发阶段：取消注释添加 Optimism 主网支持
export const BUNDLER_URL: BundlerUrl = {
    // 10: import.meta.env.VITE_OP_BUNDLER_URL!, // 测试阶段注释掉
    11155111: import.meta.env.VITE_SEPOLIA_BUNDLER_URL!,
}

export const RPC_URL: RPCUrl = {
    // 10: import.meta.env.VITE_OP_RPC_URL!, // 测试阶段注释掉
    11155111: import.meta.env.VITE_SEPOLIA_RPC_URL!,
}