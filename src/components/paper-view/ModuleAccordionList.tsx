import { useState, useEffect, useCallback, useRef } from 'react';
import { MODULE_REGISTRY } from '@/types/modules';
import type { ModuleId, SubPersonaId } from '@/types/modules';
import type { Figure } from '@/types/structured-paper';
import ModuleAccordion from './ModuleAccordion';

interface ModuleAccordionListProps {
  paperId: number;
  subPersonaId: SubPersonaId;
  moduleOrder: ModuleId[];
  figures?: Figure[];
}

const ModuleAccordionList = ({ paperId, subPersonaId, moduleOrder, figures = [] }: ModuleAccordionListProps) => {
  const [openModuleId, setOpenModuleId] = useState<ModuleId | null>(null);
  const [contentCache, setContentCache] = useState<Record<string, unknown>>({});
  const prevPersona = useRef(subPersonaId);

  // Clear cache & collapse when persona changes
  useEffect(() => {
    if (prevPersona.current !== subPersonaId) {
      setContentCache({});
      setOpenModuleId(null);
      prevPersona.current = subPersonaId;
    }
  }, [subPersonaId]);

  const handleContentLoaded = useCallback((moduleId: ModuleId, content: unknown) => {
    setContentCache((prev) => ({ ...prev, [`${moduleId}_${subPersonaId}`]: content }));
  }, [subPersonaId]);

  const handleToggle = useCallback((moduleId: ModuleId) => {
    setOpenModuleId((prev) => (prev === moduleId ? null : moduleId));
  }, []);

  // Split into ordered core and satellite groups
  const orderedModules = moduleOrder
    .map((id) => MODULE_REGISTRY.find((m) => m.id === id)!)
    .filter(Boolean);

  const coreModules = orderedModules.filter((m) => m.tier === 'core');
  const satelliteModules = orderedModules.filter((m) => m.tier === 'satellite');

  const renderSection = (
    title: string,
    modules: typeof orderedModules,
    borderClass: string,
  ) => {
    if (modules.length === 0) return null;
    return (
      <div className="space-y-3">
      <h3 className="font-serif text-sm font-semibold text-foreground flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${borderClass === 'border-l-[#3B82F6]' ? 'bg-[#3B82F6]' : 'bg-[#F59E0B]'}`} />
          {title}
        </h3>
        <div className="space-y-3">
          {modules.map((mod) => {
            const cacheKey = `${mod.id}_${subPersonaId}`;
            return (
              <ModuleAccordion
                key={mod.id}
                paperId={paperId}
                moduleId={mod.id}
                subPersonaId={subPersonaId}
                moduleDefinition={mod}
                isOpen={openModuleId === mod.id}
                onToggle={() => handleToggle(mod.id)}
                cachedContent={contentCache[cacheKey] ?? null}
                onContentLoaded={handleContentLoaded}
                figures={figures}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderSection('Core Research', coreModules, 'border-l-[#3B82F6]')}
      {renderSection('Satellite Modules', satelliteModules, 'border-l-[#F59E0B]')}
    </div>
  );
};

export default ModuleAccordionList;
