interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
  serif?: boolean
}

export function PageHeader({ title, description, children, serif = true }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1
          className={`text-2xl md:text-[28px] font-semibold text-foreground ${
            serif ? "font-serif" : "font-sans"
          }`}
        >
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 shrink-0">{children}</div>
      )}
    </div>
  )
}
