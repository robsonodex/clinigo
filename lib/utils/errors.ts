/**
 * Custom Error Classes for API Error Handling
 */
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/**
 * Base Application Error
 */
export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number = 500,
        public code?: string
    ) {
        super(message)
        this.name = 'AppError'
    }
}

/**
 * Resource Not Found Error (404)
 */
export class NotFoundError extends AppError {
    constructor(resource: string) {
        super(`${resource} não encontrado`, 404, 'NOT_FOUND')
        this.name = 'NotFoundError'
    }
}

/**
 * Conflict Error (409) - Used for double-booking, duplicate resources
 */
export class ConflictError extends AppError {
    constructor(message: string, public data?: unknown) {
        super(message, 409, 'CONFLICT')
        this.name = 'ConflictError'
    }
}

/**
 * Unauthorized Error (401)
 */
export class UnauthorizedError extends AppError {
    constructor(message = 'Não autorizado') {
        super(message, 401, 'UNAUTHORIZED')
        this.name = 'UnauthorizedError'
    }
}

/**
 * Forbidden Error (403)
 */
export class ForbiddenError extends AppError {
    constructor(message = 'Acesso negado') {
        super(message, 403, 'FORBIDDEN')
        this.name = 'ForbiddenError'
    }
}

/**
 * Validation Error (400)
 */
export class ValidationError extends AppError {
    constructor(message: string, public errors?: unknown) {
        super(message, 400, 'VALIDATION_ERROR')
        this.name = 'ValidationError'
    }
}

/**
 * Bad Request Error (400)
 */
export class BadRequestError extends AppError {
    constructor(message: string) {
        super(message, 400, 'BAD_REQUEST')
        this.name = 'BadRequestError'
    }
}

/**
 * Rate Limit Error (429)
 */
export class RateLimitError extends AppError {
    constructor(message = 'Muitas requisições. Tente novamente mais tarde.') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED')
        this.name = 'RateLimitError'
    }
}

/**
 * Global API Error Handler
 * Converts any error into a standardized JSON response
 */
export function handleApiError(error: unknown): NextResponse {
    console.error('API Error:', error)

    // Handle Zod validation errors
    if (error instanceof ZodError) {
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Dados inválidos',
                    code: 'VALIDATION_ERROR',
                    details: error.errors.map((e) => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                },
            },
            { status: 400 }
        )
    }

    // Handle custom AppError
    if (error instanceof AppError) {
        const response: Record<string, unknown> = {
            success: false,
            error: {
                message: error.message,
                code: error.code,
            },
        }

        // Include additional data for conflict errors (e.g., available slots)
        if (error instanceof ConflictError && error.data) {
            response.data = error.data
        }

        // Include validation errors
        if (error instanceof ValidationError && error.errors) {
            (response.error as Record<string, unknown>).details = error.errors
        }

        return NextResponse.json(response, { status: error.statusCode })
    }

    // Handle Supabase errors
    if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        'message' in error
    ) {
        const supabaseError = error as { code: string; message: string }

        // Handle specific Supabase error codes
        if (supabaseError.code === 'PGRST116') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Recurso não encontrado',
                        code: 'NOT_FOUND',
                    },
                },
                { status: 404 }
            )
        }

        if (supabaseError.code === '23505') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Registro duplicado',
                        code: 'DUPLICATE',
                    },
                },
                { status: 409 }
            )
        }

        return NextResponse.json(
            {
                success: false,
                error: {
                    message: supabaseError.message,
                    code: supabaseError.code,
                },
            },
            { status: 400 }
        )
    }

    // Unknown error
    return NextResponse.json(
        {
            success: false,
            error: {
                message: 'Erro interno do servidor',
                code: 'INTERNAL_ERROR',
            },
        },
        { status: 500 }
    )
}
