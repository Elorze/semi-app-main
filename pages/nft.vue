<template>
  <div class="flex flex-col container-size rounded-xl bg-[var(--ui-bg)] shadow-lg p-4">
    <UButton icon="i-heroicons-arrow-left" color="neutral" variant="ghost" class="self-start mb-4"
      @click="navigateTo('/')">
      返回
    </UButton>

    <h1 class="text-2xl font-bold mb-6">NFT展览</h1>

    <!-- Loading状态 -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      <span class="ml-2 text-gray-600">加载中...</span>
    </div>

    <!-- NFT网格 - 优化后的自适应布局 -->
    <div v-if="nfts.length" class="nft-grid-container">
      <div class="nft-grid">
        <div v-for="nft in nfts" :key="`${nft.tokenAddress}-${nft.id}`" 
          class="nft-card">
          <div class="nft-card-image">
            <img
              v-show="!hasImageError(nft)"
              :src="currentImageSrc(nft)"
              @error="() => handleImageError(nft)"
              class="nft-card-img"
              :alt="nft.metadata.name || 'NFT'"
            />
            <div v-if="hasImageError(nft)" class="nft-card-placeholder">
              <UIcon name="i-heroicons-photo" size="32" class="text-gray-400" />
            </div>
          </div>
          <div class="nft-card-content">
            <h3 class="nft-card-title">
              {{ nft.metadata.name || `NFT #${nft.id}` }}
            </h3>
            <p v-if="nft.metadata.description" class="nft-card-description">
              {{ nft.metadata.description }}
            </p>
            <div class="nft-card-meta">
              Token ID: {{ nft.id }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && nfts.length === 0" class="flex flex-col items-center justify-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-photo" size="48" />
      </div>
      <p class="text-gray-600">暂无NFT数据</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fetchNFTs } from '~/utils/nft'
import { buildIpfsGatewayUrls } from '~/utils/nft'

// NFT数据类型定义
interface NFTMetadata {
  animation_url?: string;
  attributes?: Record<string, unknown> | Array<Record<string, unknown>>;
  background_color?: string;
  description?: string;
  external_url?: string;
  image?: string;
  image_url?: string;
  name?: string;
  properties?: Record<string, unknown> | Array<Record<string, unknown>>;
  uri: string;
}

interface NFT {
  chainId: number;
  id: bigint;
  metadata: NFTMetadata;
  owner: string | null;
  tokenAddress: string;
  tokenURI: string;
  type: "ERC721" | "ERC1155";
}

const nfts = ref<NFT[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const imageErrorMap = reactive<Record<string, boolean>>({})
const imageAttemptIndex = reactive<Record<string, number>>({})

const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    nfts.value = await fetchNFTs()
    console.log('获取到的NFT数据:', nfts.value)
  } catch (err) {
    console.error('获取NFT失败:', err)
    // 🔧 不设置错误，而是设置为空数组，显示"没有NFT"而不是错误信息
    nfts.value = []
  } finally {
    loading.value = false
  }
}

const buildNftKey = (nft: NFT) => `${nft.tokenAddress}-${nft.id}`
const hasImageError = (nft: NFT) => !!imageErrorMap[buildNftKey(nft)]
const handleImageError = (nft: NFT) => {
  const key = buildNftKey(nft)
  const urls = buildIpfsGatewayUrls(nft.metadata.image || nft.metadata.image_url)
  const idx = (imageAttemptIndex[key] ?? 0) + 1
  if (idx < urls.length) {
    imageAttemptIndex[key] = idx
  } else {
    imageErrorMap[key] = true
  }
}

const currentImageSrc = (nft: NFT) => {
  const urls = buildIpfsGatewayUrls(nft.metadata.image || nft.metadata.image_url)
  const key = buildNftKey(nft)
  const idx = imageAttemptIndex[key] ?? 0
  return urls[idx] || ''
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
/* 原有的文本截断样式 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* NFT网格容器 - 防止横向溢出 */
.nft-grid-container {
  width: 100%;
  overflow-x: hidden;
}

/* NFT网格 - 自适应列数布局 */
.nft-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  width: 100%;
}

/* NFT卡片 */
.nft-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.nft-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

/* 卡片图片容器 */
.nft-card-image {
  position: relative;
  aspect-ratio: 1;
  background-color: #f5f5f5;
  overflow: hidden;
}

/* 卡片图片 */
.nft-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* 图片占位符 */
.nft-card-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e5e5e5;
}

/* 卡片内容 */
.nft-card-content {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 卡片标题 */
.nft-card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 卡片描述 */
.nft-card-description {
  font-size: 14px;
  color: #666;
  margin: 0 0 12px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

/* 卡片元信息 */
.nft-card-meta {
  font-size: 12px;
  color: #999;
  margin-top: auto;
}

/* 响应式断点 */
@media (max-width: 768px) {
  .nft-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }
  
  .nft-card-content {
    padding: 12px;
  }
  
  .nft-card-title {
    font-size: 14px;
  }
  
  .nft-card-description {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .nft-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
  }
  
  .nft-card-content {
    padding: 8px;
  }
}
</style>
