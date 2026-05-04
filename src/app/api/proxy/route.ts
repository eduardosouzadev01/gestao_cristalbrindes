import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_TARGETS = [
  'https://api.minhaxbz.com.br',
  'https://api.asiaimport.com.br',
  'https://ws.spotgifts.com.br',
  'https://cdn.xbzbrindes.com.br',
]

const API_CONFIG = {
  xbz: {
    baseUrl: 'https://api.minhaxbz.com.br:5001/api/clientes/GetListaDeProdutos',
    cnpj: process.env.XBZ_CNPJ || '',
    token: process.env.XBZ_TOKEN || '',
  },
  asia: {
    baseUrl: 'https://api.asiaimport.com.br/',
    apiKey: process.env.ASIA_API_KEY || '',
    secretKey: process.env.ASIA_SECRET_KEY || '',
  },
  spot: {
    accessKey: process.env.SPOT_ACCESS_KEY || '',
    baseUrl: 'https://ws.spotgifts.com.br/downloads/v1SSL/file',
  },
}

function isAllowedTarget(url: string): boolean {
  try {
    const target = new URL(url)
    return ALLOWED_TARGETS.some(
      (allowed) => target.origin === new URL(allowed).origin
    )
  } catch {
    return false
  }
}

async function fetchXBZ(): Promise<Response> {
  const url = `${API_CONFIG.xbz.baseUrl}?cnpj=${API_CONFIG.xbz.cnpj}&token=${API_CONFIG.xbz.token}`
  return fetch(url)
}

async function fetchXBZPage(targetUrl: string): Promise<Response> {
  return fetch(targetUrl)
}

async function fetchAsia(page: number): Promise<Response> {
  const params = new URLSearchParams()
  params.append('api_key', API_CONFIG.asia.apiKey)
  params.append('secret_key', API_CONFIG.asia.secretKey)
  params.append('funcao', 'listarProdutos2')
  params.append('por_pagina', '100')
  params.append('pagina', String(page))
  return fetch(API_CONFIG.asia.baseUrl, {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}

async function fetchSpot(dataType: string): Promise<Response> {
  const url = `${API_CONFIG.spot.baseUrl}?AccessKey=${API_CONFIG.spot.accessKey}&data=${dataType}&lang=PT&extension=csv`
  return fetch(url)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, targetUrl, page, dataType } = body

    let response: Response

    switch (action) {
      case 'xbz':
        response = await fetchXBZ()
        break
      case 'xbz-page':
        if (!targetUrl || !isAllowedTarget(targetUrl)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        response = await fetchXBZPage(targetUrl)
        break
      case 'asia':
        response = await fetchAsia(page || 1)
        break
      case 'spot':
        response = await fetchSpot(dataType || 'products')
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return NextResponse.json(
        { error: `Upstream error ${response.status}: ${text.slice(0, 200)}` },
        { status: response.status }
      )
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('text/csv') || action === 'spot') {
      const text = await response.text()
      return new NextResponse(text, {
        headers: { 'Content-Type': 'text/csv; charset=utf-8' },
      })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url || !isAllowedTarget(url)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const response = await fetch(url)
    const text = await response.text()
    return new NextResponse(text, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
