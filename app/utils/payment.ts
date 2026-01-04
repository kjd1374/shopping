import { SERVICE_FEE, SHIPPING_RATE_PER_KG, BANK_INFO } from '@/app/lib/constants'

/**
 * Calculate shipping fee based on total weight
 * @param totalWeight - Total weight in kg
 * @returns Shipping fee in VND
 */
export function calculateShippingFee(totalWeight: number): number {
    if (totalWeight <= 0) return 0;
    // 올림 처리 (예: 0.1kg -> 15,000 VND?) 
    // 기본적으로 정직하게 곱함. 필요시 올림 정책 적용
    return Math.round(totalWeight * SHIPPING_RATE_PER_KG);
}

/**
 * Generate VietQR URL for dynamic QR code payment
 * @param amount - Amount in VND
 * @param content - Payment description (e.g. Order ID)
 * @returns VietQR URL
 */
export function generateVietQRUrl(amount: number, content: string): string {
    // VietQR Quick Link Format:
    // https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<CONTENT>&accountName=<ACCOUNT_NAME>

    // Remove spaces from bank ID and account no just in case
    const bankId = BANK_INFO.BANK_ID.trim();
    const accountNo = BANK_INFO.ACCOUNT_NO.trim();
    const template = BANK_INFO.TEMPLATE;

    const baseUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png`;
    const params = new URLSearchParams({
        amount: amount.toString(),
        addInfo: content,
        accountName: BANK_INFO.ACCOUNT_NAME
    });

    return `${baseUrl}?${params.toString()}`;
}
