// API 响应的基础接口
interface BaseResponse {
    result?: 'ok';
    error?: string;
}

// 用户信息接口
export interface UserInfo {
    id: string;
    handle: string | null;
    email: string | null;
    phone: string;
    image_url: string | null;
    evm_chain_address?: string | null;
    evm_chain_active_key?: string | null;
    remaining_gas_credits?: number;
    total_used_gas_credits?: number;
    encrypted_keys?: string | null;
}

// 登录响应接口
interface SignInResponse extends BaseResponse {
    auth_token: string;
    phone: string;
    id: string;
    address_type: 'phone';
}

// 加密密钥响应接口
interface EncryptedKeysResponse extends BaseResponse {
    encrypted_keys: string;
}

// API 基础配置
export const API_BASE_URL = 'http://3.0.109.229:3000';
export const AUTH_TOKEN_KEY = 'semi_auth_token';

export const MOCK_RESPONSE = true;

// 方案B：全局变量存储真实生成的钱包信息
let mockWalletInfo: { evm_chain_address?: string; evm_chain_active_key?: string; encrypted_keys?: string } = {}

// Mock 用户数据
const mockUser = {
    id: 1,
    phone: '13800138000',
    evm_chain_address: '0x1B8c9A4057D9Ed35F8740fFbC96229aF43ACeE95', // 更新为正确的 Safe Account 地址
    evm_chain_active_key: '0x1eab22ccc0e4e0f2f1430de7d12580481e4a5fefa15257449f2ef26284b090ab', // 更新为正确的私钥
    encrypted_keys: JSON.stringify({
        version: 3,
        id: 'mock-id',
        address: '0xDce410f6BD8FD4dAa45026EDb8F8b0C2C9cc904e', // 普通地址
        crypto: {
            ciphertext: 'mock_ciphertext',
            cipherparams: { iv: 'mock_iv_hex' },
            cipher: 'aes-128-ctr',
            kdf: 'pbkdf2',
            kdfparams: {
                dklen: 32,
                salt: 'mock_salt_hex',
                c: 262144,
                prf: 'hmac-sha256'
            },
            mac: 'mock_mac'
        }
    })
}

// 通用请求处理函数
async function handleRequest<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '请求失败');
    }
    return response.json();
}

// 获取认证头
function getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    const authToken = getCookie(AUTH_TOKEN_KEY);
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
}

// 设置认证令牌
export function setAuthToken(token: string) {
    setCookie(AUTH_TOKEN_KEY, token, 30); // 设置30天过期
}

// 清除认证令牌
export function clearAuthToken() {
    deleteCookie(AUTH_TOKEN_KEY);
}

// Cookie 操作辅助函数
export function setCookie(name: string, value: string, days: number) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/`;
}

export function getCookie(name: string): string | null {
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

export function deleteCookie(name: string) {
    setCookie(name, '', -1);
}

// 登出方法
export function logout(): void {
    clearAuthToken();
}

// 1. 获取欢迎信息
export async function getHello(): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/`);
    return handleRequest<{ message: string }>(response);
}

// 2. 发送短信验证码
export async function sendSMS(phone: string): Promise<BaseResponse> {
    // mock
    if (MOCK_RESPONSE) {
        return {
            result: 'ok',
            message: '验证码已发送',
        } as BaseResponse
    }
    
    const response = await fetch(`${API_BASE_URL}/send_sms`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ phone }),
    });
    return handleRequest<BaseResponse>(response);
}

// 3. 使用手机号和验证码登录
export async function signIn(phone: string, code: string): Promise<SignInResponse> {
    // mock
    const moc_response = {
        result: 'ok',
        auth_token: '1234567890',
        phone: phone,
        id: '1234567890',
        address_type: 'phone',
    } as SignInResponse

    if (MOCK_RESPONSE) {
        setAuthToken('1234567890');
        return moc_response
    }
    
    const response = await fetch(`${API_BASE_URL}/signin`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ phone, code }),
    });
    const data = await handleRequest<SignInResponse>(response);
    if (data.auth_token) {
        setAuthToken(data.auth_token);
    }
    return data;
}

// 4. 设置用户句柄
export async function setHandle(id: string, handle: string): Promise<BaseResponse> {
    const response = await fetch(`${API_BASE_URL}/set_handle`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, handle }),
    });
    return handleRequest<BaseResponse>(response);
}

// 5. 设置用户头像 URL
export async function setImageUrl(id: string, image_url: string): Promise<BaseResponse> {
    const response = await fetch(`${API_BASE_URL}/set_image_url`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, image_url }),
    });
    return handleRequest<BaseResponse>(response);
}

// 6. 设置加密密钥

export interface SetEncryptedKeysProps  {
    id: string;
    encrypted_keys: string;
    evm_chain_address: string;
    evm_chain_active_key: string;
}

export async function setEncryptedKeys(props: SetEncryptedKeysProps): Promise<BaseResponse> {
    if (MOCK_RESPONSE) {
        // 方案B：保存真实生成的钱包信息到全局变量
        mockWalletInfo = {
            evm_chain_address: props.evm_chain_address,
            evm_chain_active_key: props.evm_chain_active_key,
            encrypted_keys: props.encrypted_keys
        }
        return { result: 'ok' } as BaseResponse;
    }
    const response = await fetch(`${API_BASE_URL}/set_encrypted_keys`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(props),
    });
    return handleRequest<BaseResponse>(response);
}

// 7. 获取加密密钥
export async function getEncryptedKeys(id: string): Promise<EncryptedKeysResponse> {
    const response = await fetch(`${API_BASE_URL}/get_encrypted_keys?id=${id}`, {
        headers: getAuthHeaders(),
    });
    return handleRequest<EncryptedKeysResponse>(response);
}

// 8. 获取用户信息
export async function getUser(id: string): Promise<UserInfo> {
    // mock - 使用真实的 Safe Account 地址
    const moc_response = {
        id: '1234567890',
        handle: 'test',
        email: 'test@test.com',
        phone: '1234567890',
        image_url: 'https://test.com/test.jpg',
        // 真实的 Safe Account 地址 - 与发送页面保持一致 测试
        evm_chain_address: '0x1B8c9A4057D9Ed35F8740fFbC96229aF43ACeE95',
        evm_chain_active_key: '0x1eab22ccc0e4e0f2f1430de7d12580481e4a5fefa15257449f2ef26284b090ab', // 对应的私钥地址
        encrypted_keys: '{"version":1,"crypto":{"ciphertext":"YWJhbmRvbiBhYmFuZG9uIGFiYW5kb24gYWJhbmRvbiBhYmFuZG9uIGFiYW5kb24gYWJhbmRvbiBhYmFuZG9uIGFiYW5kb24gYWJhbmRvbiBhYmFuZG9uIGFiYW5kb24gYWJhbmRvbiBhYmFuZG9u","iv":"123456789012345678901234","salt":"12345678901234567890123456789012","kdf":"pbkdf2","cipher":"aes-gcm","iterations":100000,"hash":"SHA-256"}}',
    } as UserInfo

    if (MOCK_RESPONSE) {
        return moc_response
    }
    const response = await fetch(`${API_BASE_URL}/get_user?id=${id}`, {
        headers: getAuthHeaders(),
    });
    return handleRequest<UserInfo>(response);
}

export async function getMe(): Promise<UserInfo> {
    // mock - 使用真实的 Safe Account 地址
    const moc_response = {
        id: '1234567890',
        handle: 'test',
        email: 'test@test.com',
        phone: '1234567890',
        image_url: 'https://test.com/test.jpg',
        // 真实的 Safe Account 地址 - 与发送页面保持一致
        evm_chain_address: '0x1B8c9A4057D9Ed35F8740fFbC96229aF43ACeE95',
        evm_chain_active_key: '0x1eab22ccc0e4e0f2f1430de7d12580481e4a5fefa15257449f2ef26284b090ab', // 对应的私钥地址
        encrypted_keys: '{"version":1,"crypto":{"ciphertext":"YWJhbmRvbiBhYmFuZG9uIGFiYW5kb24gYWJhbmRvbiBhYmFuZG9uIGFiYW5kb24gYWJhbmRvbiBhYmFuZG9uIGFiYW5kb24gYWJhbmRvbiBhYmFuZG9uIGFiYW5kb24gYWJhbmRvbiBhYmFuZG9u","iv":"123456789012345678901234","salt":"12345678901234567890123456789012","kdf":"pbkdf2","cipher":"aes-gcm","iterations":100000,"hash":"SHA-256"}}',
    } as UserInfo

    if (MOCK_RESPONSE) {
        return moc_response
    }
    const response = await fetch(`${API_BASE_URL}/get_me`, {
        headers: getAuthHeaders(),
    });
    return handleRequest<UserInfo>(response);
}

// 9. 设置EVM链地址
export async function setEvmChainAddress(id: string, evm_chain_address: string, evm_chain_active_key: string): Promise<BaseResponse> {
    const response = await fetch(`${API_BASE_URL}/set_evm_chain_address`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, evm_chain_address, evm_chain_active_key }),
    });
    return handleRequest<BaseResponse>(response);
}
