// import { Resend } from 'resend';

// const resend = new Resend(process.env.RESEND_API_KEY);

// TODO: [중요] 여기에 알림을 받을 사장님의 이메일 주소를 입력하거나, .env 파일에 ADMIN_EMAIL_RECIPIENT를 설정하세요.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL_RECIPIENT || 'admin@example.com';

interface NotificationData {
    type: 'NEW_REQUEST' | 'NEW_ORDER';
    data: any;
}

export async function sendAdminNotification({ type, data }: NotificationData) {
    // if (!process.env.RESEND_API_KEY) {
    //     console.warn('RESEND_API_KEY is not set. Email notification skipped.');
    //     return { success: false, error: 'API Key missing' };
    // }
    console.log('Email notification skipped (disabled for development)');
    return { success: true, data: null };

    /*
    try {
        let subject = '';
        let html = '';

        if (type === 'NEW_REQUEST') {
            subject = `[New Request] ${data.title || 'Unknown Item'}`;
            html = `
                <h1>New Request Received</h1>
                <p><strong>User:</strong> ${data.user_email || 'Anonymous'}</p>
                <p><strong>Item:</strong> ${data.title}</p>
                <p><strong>Quantity:</strong> ${data.quantity}</p>
                <p><strong>Link:</strong> <a href="${data.url}">${data.url}</a></p>
                <hr/>
                <p>Please check the admin panel to review this request.</p>
            `;
        } else if (type === 'NEW_ORDER') {
            subject = `[New Order] Order #${data.requestId.slice(0, 8)}`;
            html = `
                <h1>New Order Placed! 💰</h1>
                <p><strong>User:</strong> ${data.user_name}</p>
                <p><strong>Total Amount:</strong> ${data.amount.toLocaleString()} VND</p>
                <p><strong>Deposit Paid (Pending):</strong> ${data.deposit.toLocaleString()} VND</p>
                <p><strong>Shipping Address:</strong> ${data.address}</p>
                <hr/>
                <p>Please verify the bank deposit and confirm the order in the admin panel.</p>
            `;
        }

        const { data: emailData, error } = await resend.emails.send({
            from: 'K-Shopping Alert <onboarding@resend.dev>', // Default Resend testing domain
            to: ADMIN_EMAIL,
            subject: subject,
            html: html,
        });

        if (error) {
            console.error('Resend Email Error:', error);
            return { success: false, error };
        }

        return { success: true, data: emailData };
    } catch (error) {
        console.error('Notification Error:', error);
        return { success: false, error };
    }
    */
}
