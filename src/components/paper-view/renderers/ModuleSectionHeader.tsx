interface ModuleSectionHeaderProps {
  title: string;
  description?: string;
  accentColor?: string;
}

export function ModuleSectionHeader({ title, description, accentColor = 'hsl(var(--primary))' }: ModuleSectionHeaderProps) {
  return (
    <div className="border-l-[3px] pl-4 py-1" style={{ borderColor: accentColor }}>
      <h3 className="text-lg font-semibold text-foreground tracking-tight">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
  );
}
