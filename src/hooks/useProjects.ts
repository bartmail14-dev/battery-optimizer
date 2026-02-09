import { useState, useCallback } from 'react';
import type { ProjectSummary } from '../types';
import type { FullProject, CreateProjectInput } from '../services/api/projects-client';
import {
  fetchProjects,
  fetchProject,
  createProject,
  updateProject,
  deleteProject,
} from '../services/api/projects-client';

export function useProjects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await fetchProjects();
      setProjects(list);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Projecten ophalen mislukt';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveProject = useCallback(async (
    name: string,
    description: string,
    state: CreateProjectInput
  ): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await createProject({ ...state, name, description });
      await loadProjects();
      setCurrentProjectId(result.id);
      return result.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Project opslaan mislukt';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadProjects]);

  const updateExistingProject = useCallback(async (
    id: string,
    data: Partial<CreateProjectInput>
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await updateProject(id, data);
      await loadProjects();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Project bijwerken mislukt';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadProjects]);

  const loadProject = useCallback(async (id: string): Promise<FullProject | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const project = await fetchProject(id);
      setCurrentProjectId(id);
      return project;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Project laden mislukt';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeProject = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await deleteProject(id);
      if (currentProjectId === id) {
        setCurrentProjectId(null);
      }
      await loadProjects();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Project verwijderen mislukt';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentProjectId, loadProjects]);

  return {
    projects,
    currentProjectId,
    isLoading,
    error,
    loadProjects,
    saveProject,
    updateProject: updateExistingProject,
    loadProject,
    deleteProject: removeProject,
    setCurrentProjectId,
  };
}
