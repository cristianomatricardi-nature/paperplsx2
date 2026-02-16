interface IntroductionData {
  context_bridge?: string;
  module_focus?: string;
  cross_references?: string;
}

interface IntroductionTabProps {
  data: IntroductionData;
}

export function IntroductionTab({ data }: IntroductionTabProps) {
  if (!data) return null;

  return (
    <div className="space-y-4">
      {data.context_bridge && (
        <p className="text-sm leading-relaxed text-foreground">
          {data.context_bridge}
        </p>
      )}
      {data.module_focus && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {data.module_focus}
        </p>
      )}
      {data.cross_references && (
        <p className="text-xs text-muted-foreground/70 border-t pt-3 mt-3">
          {data.cross_references}
        </p>
      )}
    </div>
  );
}
