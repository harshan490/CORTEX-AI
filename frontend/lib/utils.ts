import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInHours, differenceInDays } from 'date-fns'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | number, pattern: string = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (isNaN(d.getTime())) return 'Invalid date'
  return format(d, pattern)
}

export function formatRelativeTime(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (isNaN(d.getTime())) return 'Invalid date'

  const now = new Date()
  const hoursDiff = differenceInHours(now, d)
  const daysDiff = differenceInDays(now, d)

  if (hoursDiff < 1) {
    const minutes = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (minutes < 1) return 'Just now'
    return `${minutes}m ago`
  }

  if (hoursDiff < 24) {
    return `${hoursDiff}h ago`
  }

  if (daysDiff < 7) {
    return `${daysDiff}d ago`
  }

  return format(d, 'MMM d, yyyy')
}

export function truncate(str: string, maxLength: number = 100): string {
  if (!str) return ''
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength).trimEnd() + '...'
}

export function generateId(length: number = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length]
  }
  return result
}
