import { forwardRef, SelectHTMLAttributes } from 'react'
import { clsx } from 'clsx'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; options: { value: string; label: string }[] }>(
  ({ className, label, error, options, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <select
        ref={ref}
        className={clsx('input', error && 'border-red-500 focus:border-red-500 focus:ring-red-500', className)}
        aria-invalid={error ? 'true' : 'false'}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600" role="alert">{error}</p>}
    </div>
  )
)
Select.displayName = 'Select'