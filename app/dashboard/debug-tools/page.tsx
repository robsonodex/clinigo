'use client'

import { useState } from 'react'

export default function DebugToolsPage() {
    const [clinicId, setClinicId] = useState('f636fe0a-fa7d-4861-885a-c0b166772f5f')
    const [result, setResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [headers, setHeaders] = useState<any>(null)

    const testEndpoint = async (url: string) => {
        setLoading(true)
        setResult(null)
        setHeaders(null)
        try {
            // Append timestamp to bypass cache
            const cacheBustedUrl = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`
            const res = await fetch(cacheBustedUrl)

            const headerObj: any = {}
            res.headers.forEach((val, key) => { headerObj[key] = val })
            setHeaders(headerObj)

            const contentType = res.headers.get('content-type') || ''
            let data: any

            if (contentType.includes('application/json')) {
                data = await res.json()
            } else {
                const text = await res.text()
                data = {
                    _rawResponse: true,
                    _contentType: contentType,
                    _textPreview: text.substring(0, 2000)
                }
            }

            setResult({
                status: res.status,
                statusText: res.statusText,
                url: res.url,
                data: data
            })

        } catch (err: any) {
            setResult({
                error: err.message,
                stack: err.stack
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">API Debug Tools</h1>

            <div className="space-y-4 p-4 border rounded-lg bg-card">
                <h2 className="text-lg font-semibold">Test Clinic API</h2>
                <div className="flex gap-4 items-center">
                    <input
                        type="text"
                        value={clinicId}
                        onChange={(e) => setClinicId(e.target.value)}
                        className="flex-1 p-2 border rounded font-mono text-sm"
                        placeholder="Clinic ID"
                    />
                </div>
                <div className="flex gap-4 flex-wrap">
                    <button
                        onClick={() => testEndpoint(`/api/clinics/${clinicId}`)}
                        disabled={loading}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
                    >
                        {loading ? 'Testing...' : 'GET /api/clinics/[id]'}
                    </button>
                    <button
                        onClick={() => testEndpoint('/api/clinics')}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:opacity-90 disabled:opacity-50"
                    >
                        GET /api/clinics (List)
                    </button>
                    <button
                        onClick={() => testEndpoint(`/api/debug-clinic/${clinicId}`)}
                        disabled={loading}
                        className="px-4 py-2 bg-yellow-600 text-white rounded hover:opacity-90 disabled:opacity-50"
                    >
                        GET /api/debug-clinic/[id]
                    </button>
                    <button
                        onClick={() => testEndpoint(`/api/clinics-detail?id=${clinicId}`)}
                        disabled={loading}
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:opacity-90 disabled:opacity-50"
                    >
                        GET /api/clinics-detail (Static)
                    </button>
                </div>
            </div>

            {result && (
                <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-muted overflow-auto max-h-96">
                        <h3 className="font-semibold mb-2">Response (Status: {result.status})</h3>
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </div>

                    <div className="p-4 border rounded-lg bg-muted overflow-auto max-h-48">
                        <h3 className="font-semibold mb-2">Response Headers</h3>
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                            {JSON.stringify(headers, null, 2)}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    )
}
