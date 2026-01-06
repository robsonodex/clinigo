'use client'

import * as React from 'react'

const TOAST_LIMIT = 5
const TOAST_REMOVE_DELAY = 5000

type ToastActionType =
    | { type: 'ADD_TOAST'; toast: ToasterToast }
    | { type: 'UPDATE_TOAST'; toast: Partial<ToasterToast> }
    | { type: 'DISMISS_TOAST'; toastId?: string }
    | { type: 'REMOVE_TOAST'; toastId?: string }

interface ToasterToast {
    id: string
    title?: string
    description?: string
    action?: React.ReactNode
    variant?: 'default' | 'destructive'
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
    if (toastTimeouts.has(toastId)) {
        return
    }

    const timeout = setTimeout(() => {
        toastTimeouts.delete(toastId)
        dispatch({
            type: 'REMOVE_TOAST',
            toastId: toastId,
        })
    }, TOAST_REMOVE_DELAY)

    toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: ToasterToast[], action: ToastActionType): ToasterToast[] => {
    switch (action.type) {
        case 'ADD_TOAST':
            return [action.toast, ...state].slice(0, TOAST_LIMIT)

        case 'UPDATE_TOAST':
            return state.map((t) =>
                t.id === action.toast.id ? { ...t, ...action.toast } : t
            )

        case 'DISMISS_TOAST': {
            const { toastId } = action

            if (toastId) {
                addToRemoveQueue(toastId)
            } else {
                state.forEach((t) => {
                    addToRemoveQueue(t.id)
                })
            }

            return state.map((t) =>
                t.id === toastId || toastId === undefined
                    ? {
                        ...t,
                    }
                    : t
            )
        }
        case 'REMOVE_TOAST':
            if (action.toastId === undefined) {
                return []
            }
            return state.filter((t) => t.id !== action.toastId)
    }
}

const listeners: Array<(state: ToasterToast[]) => void> = []

let memoryState: ToasterToast[] = []

function dispatch(action: ToastActionType) {
    memoryState = reducer(memoryState, action)
    listeners.forEach((listener) => {
        listener(memoryState)
    })
}

type Toast = Omit<ToasterToast, 'id'>

function toast({ ...props }: Toast) {
    const id = Math.random().toString(36).slice(2, 9)

    const update = (props: ToasterToast) =>
        dispatch({
            type: 'UPDATE_TOAST',
            toast: { ...props, id },
        })
    const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id })

    dispatch({
        type: 'ADD_TOAST',
        toast: {
            ...props,
            id,
        },
    })

    // Auto dismiss after 5 seconds
    setTimeout(() => {
        dismiss()
    }, TOAST_REMOVE_DELAY)

    return {
        id: id,
        dismiss,
        update,
    }
}

function useToast() {
    const [state, setState] = React.useState<ToasterToast[]>(memoryState)

    React.useEffect(() => {
        listeners.push(setState)
        return () => {
            const index = listeners.indexOf(setState)
            if (index > -1) {
                listeners.splice(index, 1)
            }
        }
    }, [state])

    return {
        toasts: state,
        toast,
        dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
    }
}

export { useToast, toast }
