import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DerivedTask, Metrics, Task, TaskUpsert } from '@/types';
import {
  calculateROI,
  computeAverageROI,
  computePerformanceGrade,
  computeRevenuePerHour,
  computeTimeEfficiency,
  computeTotalRevenue,
  withDerived,
  sortTasks as sortDerived,
} from '@/utils/logic';
// Local storage removed per request; keep everything in memory
import { generateSalesTasks } from '@/utils/seed';

interface UseTasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  derivedSorted: DerivedTask[];
  metrics: Metrics;
  lastDeleted: Task | null;
  showUndo: boolean;
  addTask: (task: TaskUpsert) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  undoDelete: () => void;
  dismissUndo: () => void;
}

const VALID_PRIORITIES: Task['priority'][] = ['High', 'Medium', 'Low'];
const VALID_STATUSES: Task['status'][] = ['Todo', 'In Progress', 'Done'];

function sanitizeRevenue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function sanitizeTimeTaken(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function sanitizePriority(value: unknown): Task['priority'] {
  return VALID_PRIORITIES.includes(value as Task['priority']) ? (value as Task['priority']) : 'Medium';
}

function sanitizeStatus(value: unknown): Task['status'] {
  return VALID_STATUSES.includes(value as Task['status']) ? (value as Task['status']) : 'Todo';
}

function sanitizeNotes(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

const INITIAL_METRICS: Metrics = {
  totalRevenue: 0,
  totalTimeTaken: 0,
  timeEfficiencyPct: 0,
  revenuePerHour: 0,
  averageROI: 0,
  performanceGrade: 'Needs Improvement',
};

export function useTasks(): UseTasksState {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDeleted, setLastDeleted] = useState<Task | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const fetchedRef = useRef(false);

  function normalizeTasks(input: any[]): Task[] {
    const now = Date.now();
    const sanitized = (Array.isArray(input) ? input : [])
      .filter(t => t && typeof t.id === 'string' && t.id.trim() && typeof t.title === 'string' && t.title.trim())
      .map((t, idx) => {
      const created = t.createdAt ? new Date(t.createdAt) : new Date(now - (idx + 1) * 24 * 3600 * 1000);
      const completed = t.completedAt || (t.status === 'Done' ? new Date(created.getTime() + 24 * 3600 * 1000).toISOString() : undefined);
        const task: Task = {
        id: t.id,
          title: t.title.trim(),
          revenue: sanitizeRevenue(t.revenue),
          timeTaken: sanitizeTimeTaken(t.timeTaken),
          priority: sanitizePriority(t.priority),
          status: sanitizeStatus(t.status),
          notes: sanitizeNotes(t.notes),
        createdAt: created.toISOString(),
        completedAt: completed,
        };
        if (import.meta.env.DEV) {
          console.log('[Tasks] normalize', { id: task.id, revenue: task.revenue, timeTaken: task.timeTaken });
        }
        return task;
      });
    return sanitized;
  }

  // Initial load: public JSON -> fallback generated dummy
  useEffect(() => {
    if (fetchedRef.current) {
      if (import.meta.env.DEV) {
        console.log('[Tasks] loadTasks skipped – already fetched');
      }
      return;
    }

    let active = true;
    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch('/tasks.json', { signal: controller.signal });
        if (!res.ok) throw new Error(`Failed to load tasks.json (${res.status})`);
        const data = (await res.json()) as any[];
        const normalized: Task[] = normalizeTasks(data);
        let finalData = normalized.length > 0 ? normalized : normalizeTasks(generateSalesTasks(50) as any);
        if (Math.random() < 0.5) {
          finalData = normalizeTasks([
            ...finalData,
            { id: undefined, title: '', revenue: NaN, timeTaken: 0, priority: 'High', status: 'Todo' } as any,
            { id: finalData[0]?.id ?? 'dup-1', title: 'Duplicate ID', revenue: 9999999999, timeTaken: -5, priority: 'Low', status: 'Done' } as any,
          ]);
        }
        const safeData = normalizeTasks(finalData);
        console.log('Tasks loaded:', new Date().toISOString());
        if (!active) return;
        if (import.meta.env.DEV) {
          console.log('[Tasks] loadTasks', { count: safeData.length });
        }
        setTasks(safeData);
        fetchedRef.current = true;
      } catch (e: any) {
        if (!active || e?.name === 'AbortError') return;
        setError(e?.message ?? 'Failed to load tasks');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const derivedSorted = useMemo<DerivedTask[]>(() => {
    const withRoi = tasks.map(withDerived);
    return sortDerived(withRoi);
  }, [tasks]);

  const metrics = useMemo<Metrics>(() => {
    if (tasks.length === 0) return INITIAL_METRICS;
    const totalRevenue = computeTotalRevenue(tasks);
    const totalTimeTaken = tasks.reduce((s, t) => s + t.timeTaken, 0);
    const timeEfficiencyPct = computeTimeEfficiency(tasks);
    const revenuePerHour = computeRevenuePerHour(tasks);
    const averageROI = computeAverageROI(tasks);
    const performanceGrade = computePerformanceGrade(averageROI);
    return { totalRevenue, totalTimeTaken, timeEfficiencyPct, revenuePerHour, averageROI, performanceGrade };
  }, [tasks]);

  const addTask = useCallback((task: TaskUpsert) => {
    setTasks(prev => {
      const id = typeof task.id === 'string' && task.id.trim() ? task.id : crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const revenue = sanitizeRevenue(task.revenue);
      const timeTaken = sanitizeTimeTaken(task.timeTaken);
      const priority = sanitizePriority(task.priority);
      const status = sanitizeStatus(task.status);
      const notes = sanitizeNotes(task.notes);
      const completedAt = status === 'Done' ? createdAt : undefined;
      const computedROI = calculateROI(revenue, timeTaken);
      if (import.meta.env.DEV) {
        console.log('[Tasks] addTask', { id, revenue, timeTaken, roi: computedROI });
      }
      const nextTask: Task = { ...task, id, revenue, timeTaken, priority, status, notes, createdAt, completedAt };
      return [...prev, nextTask];
    });
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id !== id) return t;
        const revenue = sanitizeRevenue(patch.revenue ?? t.revenue);
        const timeTaken = sanitizeTimeTaken(patch.timeTaken ?? t.timeTaken);
        const priority = sanitizePriority(patch.priority ?? t.priority);
        const status = sanitizeStatus(patch.status ?? t.status);
        const notes = sanitizeNotes(patch.notes ?? t.notes);
        const merged: Task = {
          ...t,
          ...patch,
          revenue,
          timeTaken,
          priority,
          status,
          notes,
        };
        if (t.status !== 'Done' && merged.status === 'Done' && !merged.completedAt) {
          merged.completedAt = new Date().toISOString();
        }
        const computedROI = calculateROI(merged.revenue, merged.timeTaken);
        if (import.meta.env.DEV) {
          console.log('[Tasks] updateTask', { id, revenue: merged.revenue, timeTaken: merged.timeTaken, roi: computedROI });
        }
        return merged;
      });
      return next;
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => {
      const target = prev.find(t => t.id === id) ?? null;
      if (target) {
      setLastDeleted(target);
        setShowUndo(true);
        if (import.meta.env.DEV) {
          console.log('[Tasks] deleteTask', { id, title: target.title });
        }
      } else {
        setLastDeleted(null);
        setShowUndo(false);
      }
      return prev.filter(t => t.id !== id);
    });
  }, []);

  const undoDelete = useCallback(() => {
     setLastDeleted(current => {
       if (!current) {
         if (import.meta.env.DEV) {
           console.log('[Tasks] undoDelete skipped – no task to restore');
         }
         setShowUndo(false);
         return null;
       }
       const restored: Task = {
         ...current,
         revenue: sanitizeRevenue(current.revenue),
         timeTaken: sanitizeTimeTaken(current.timeTaken),
         priority: sanitizePriority(current.priority),
         status: sanitizeStatus(current.status),
         notes: sanitizeNotes(current.notes),
       };
       setTasks(prev => [...prev, restored]);
       setShowUndo(false);
       if (import.meta.env.DEV) {
         console.log('[Tasks] undoDelete', { id: restored.id, title: restored.title });
       }
       return null;
     });
   }, []);

  const dismissUndo = useCallback(() => {
    setShowUndo(false);
    setLastDeleted(null);
    if (import.meta.env.DEV) {
      console.log('[Tasks] dismissUndo called');
    }
  }, []);

  return { tasks, loading, error, derivedSorted, metrics, lastDeleted, showUndo, addTask, updateTask, deleteTask, undoDelete, dismissUndo };
}


