import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata um valor numérico como preço em formato brasileiro (R$ 143,00)
 * @param value - Valor numérico a ser formatado
 * @param decimals - Número de casas decimais (padrão: 2)
 * @returns String formatada no formato brasileiro
 */
export function formatPrice(value: number, decimals: number = 2): string {
  return value.toFixed(decimals).replace('.', ',')
}