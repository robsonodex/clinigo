'use client'

import { useEffect, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

interface ParallaxLayerProps {
    children: React.ReactNode
    className?: string
    speed?: number
    direction?: 'up' | 'down'
}

export function ParallaxLayer({
    children,
    className = '',
    speed = 0.5,
    direction = 'up',
}: ParallaxLayerProps) {
    const { scrollY } = useScroll()
    const [elementTop, setElementTop] = useState(0)

    const y = useTransform(
        scrollY,
        [elementTop - 500, elementTop + 500],
        direction === 'up' ? [0, -100 * speed] : [0, 100 * speed]
    )

    return (
        <motion.div
            style={{ y }}
            className={className}
            onViewportEnter={(entry) => {
                if (entry?.target) {
                    setElementTop(entry.target.getBoundingClientRect().top + window.scrollY)
                }
            }}
        >
            {children}
        </motion.div>
    )
}
