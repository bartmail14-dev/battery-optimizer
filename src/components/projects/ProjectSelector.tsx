import { useEffect, useState, useRef } from 'react';
import { FolderOpen, ChevronDown, Trash2, Loader2 } from 'lucide-react';
import type { ProjectSummary } from '../../types';

interface ProjectSelectorProps {
  projects: ProjectSummary[];
  currentProjectId: string | null;
  isLoading: boolean;
  onLoadProjects: () => void;
  onSelectProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

export function ProjectSelector({
  projects,
  currentProjectId,
  isLoading,
  onLoadProjects,
  onSelectProject,
  onDeleteProject,
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleOpen() {
    if (!isOpen) {
      onLoadProjects();
    }
    setIsOpen(!isOpen);
  }

  const currentProject = projects.find((p) => p.id === currentProjectId);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        <FolderOpen className="h-4 w-4 text-gray-400" />
        <span className="max-w-[150px] truncate">
          {currentProject ? currentProject.name : 'Projecten'}
        </span>
        <ChevronDown className="h-3 w-3 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-2">
            <p className="text-xs font-medium text-gray-500">Opgeslagen projecten</p>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : projects.length === 0 ? (
              <p className="px-4 py-4 text-center text-sm text-gray-400">
                Geen projecten opgeslagen
              </p>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  className={`flex items-center justify-between px-4 py-2 hover:bg-gray-50 ${
                    project.id === currentProjectId ? 'bg-blue-50' : ''
                  }`}
                >
                  <button
                    onClick={() => {
                      onSelectProject(project.id);
                      setIsOpen(false);
                    }}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-medium text-gray-900">{project.name}</p>
                    <p className="text-xs text-gray-400">
                      {project.sector} &middot; {(project.annualConsumptionKwh / 1000).toFixed(0)} MWh
                    </p>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProject(project.id);
                    }}
                    className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
                    title="Verwijder project"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
