/**
 * Standardized API Response Utilities
 */
import { NextResponse } from 'next/server'

interface SuccessResponseOptions {
    status?: number
    headers?: Record<string, string>
}

interface ErrorResponseOptions {
    status?: number
    code?: string
    details?: unknown
    headers?: Record<string, string>
}

interface PaginatedData<T> {
    items: T[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

/**
 * Success Response
 * Returns a standardized success response
 */
export function successResponse<T>(
    data: T,
    options: SuccessResponseOptions = {}
): NextResponse {
    const { status = 200, headers = {} } = options

    return NextResponse.json(
        {
            success: true,
            data,
        },
        { status, headers }
    )
}

/**
 * Created Response (201)
 * Use when a resource is successfully created
 */
export function createdResponse<T>(
    data: T,
    options: Omit<SuccessResponseOptions, 'status'> = {}
): NextResponse {
    return successResponse(data, { ...options, status: 201 })
}

/**
 * No Content Response (204)
 * Use for successful delete operations
 */
export function noContentResponse(): NextResponse {
    return new NextResponse(null, { status: 204 })
}

/**
 * Error Response
 * Returns a standardized error response
 */
export function errorResponse(
    message: string,
    options: ErrorResponseOptions = {}
): NextResponse {
    const { status = 400, code, details, headers = {} } = options

    const errorBody: Record<string, unknown> = {
        message,
    }

    if (code) {
        errorBody.code = code
    }

    if (details) {
        errorBody.details = details
    }

    return NextResponse.json(
        {
            success: false,
            error: errorBody,
        },
        { status, headers }
    )
}

/**
 * Paginated Response
 * Returns data with pagination metadata
 */
export function paginatedResponse<T>(
    data: PaginatedData<T>,
    options: SuccessResponseOptions = {}
): NextResponse {
    const { status = 200, headers = {} } = options

    return NextResponse.json(
        {
            success: true,
            data: data.items,
            pagination: {
                total: data.total,
                page: data.page,
                pageSize: data.pageSize,
                totalPages: data.totalPages,
                hasMore: data.page < data.totalPages,
            },
        },
        { status, headers }
    )
}

/**
 * Parse pagination params from URL search params
 */
export function parsePaginationParams(searchParams: URLSearchParams): {
    page: number
    pageSize: number
    offset: number
} {
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(
        100,
        Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10))
    )
    const offset = (page - 1) * pageSize

    return { page, pageSize, offset }
}

/**
 * Build paginated response data
 */
export function buildPaginatedData<T>(
    items: T[],
    total: number,
    page: number,
    pageSize: number
): PaginatedData<T> {
    return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    }
}

