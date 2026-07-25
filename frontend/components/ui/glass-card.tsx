'use client'

import { motion, type Variants } from 'framer-motion'
import { cn } from '../../lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  onClick?: () => void
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

const hoverVariants: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.3, ease: 'easeOut' } },
}

export function GlassCard({ children, className, hover = false, glow = false, onClick }: GlassCardProps) {
  const combinedVariants = hover ? { ...cardVariants, ...hoverVariants } : cardVariants
  return (
    <motion.div
      variants={combinedVariants}
      initial="hidden"
      animate="visible"
      whileHover={hover ? 'hover' : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl',
        'shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]',
        hover && 'cursor-pointer transition-colors duration-300 hover:border-purple-500/30 hover:bg-white/[0.08]',
        glow && 'shadow-[0_0_20px_rgba(124,58,237,0.5),0_0_40px_rgba(124,58,237,0.2)]',
        className
      )}
    >
      {children}
    </motion.div>
  )
}
