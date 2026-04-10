import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "npm:nodemailer";

Deno.serve(async (req: Request) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (req.method !== 'POST') {
            throw new Error('Only POST requests are allowed');
        }

        const { to, subject, html, replyTo, smtpUser, smtpPass } = await req.json();

        if (!to || !subject || !html || !smtpUser || !smtpPass) {
            throw new Error('Missing required fields');
        }

        const transporter = nodemailer.createTransport({
            host: "mail.cristalbrindes.com.br",
            port: 465,
            secure: true,
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        });

        const info = await transporter.sendMail({
            from: `"Cristal Brindes" <${smtpUser}>`,
            to: to,
            replyTo: replyTo || smtpUser,
            subject: subject,
            html: html
        });

        return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        console.error('Email send error:', err);
        return new Response(JSON.stringify({ error: err.message || 'Failed to send email' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
