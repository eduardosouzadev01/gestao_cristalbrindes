import { NextRequest, NextResponse } from 'next/server'

const SENDER_ACCOUNTS: Record<string, { pass: string; name: string }> = {
  'vendas01@cristalbrindes.com.br': {
    pass: process.env.SMTP_VENDAS01_PASS || '',
    name: 'Vendas 01',
  },
  'vendas02@cristalbrindes.com.br': {
    pass: process.env.SMTP_VENDAS02_PASS || '',
    name: 'Vendas 02',
  },
  'vendas03@cristalbrindes.com.br': {
    pass: process.env.SMTP_VENDAS03_PASS || '',
    name: 'Vendas 03',
  },
  'vendas04@cristalbrindes.com.br': {
    pass: process.env.SMTP_VENDAS04_PASS || '',
    name: 'Vendas 04',
  },
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, cc, senderId, subject, html, replyTo } = body

    if (!to || !senderId || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, senderId, subject, html' },
        { status: 400 }
      )
    }

    const account = SENDER_ACCOUNTS[senderId]
    if (!account || !account.pass) {
      return NextResponse.json(
        { error: 'Invalid sender or missing credentials' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-email`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: to + (cc ? `, ${cc}` : ''),
          subject,
          html,
          replyTo: replyTo || senderId,
          smtpUser: senderId,
          smtpPass: account.pass,
        }),
      }
    )

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return NextResponse.json(
        { error: `Email service error: ${text.slice(0, 200)}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    if (data?.error) {
      return NextResponse.json({ error: data.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
