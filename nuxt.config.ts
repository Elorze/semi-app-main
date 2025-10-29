// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  ui: {
    fonts: false
  },
  modules: ['@nuxt/icon', '@nuxt/ui', '@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'Semi', // default fallback title
      htmlAttrs: {
        lang: 'zh-CN',
      }
    }
  },
  // 运行时配置：用于访问环境变量
  runtimeConfig: {
    // 服务端私有环境变量（不会暴露给客户端）
    optimisticEtherscanApiKey: process.env.OPTIMISTIC_ETHERSCAN_API_KEY || '',
    
    // public 中的变量客户端也可以访问
    public: {
      // 如果需要客户端访问的变量，在这里添加
      opRpcUrl: process.env.NUXT_PUBLIC_OP_RPC_URL || '',
      opBundlerUrl: process.env.NUXT_PUBLIC_OP_BUNDLER_URL || '',     
    }
  }
})