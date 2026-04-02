import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Filter, Search, SlidersHorizontal } from 'lucide-react';
import { taskAPI } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import TaskCard from '../../components/tasks/TaskCard';
import CreateTaskModal from '../../components/tasks/CreateTaskModal';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const COLUMNS = [
  { id: 'todo',        label: 'To Do',       color: 'text-slate-400',  dot: 'bg-slate-400' },
  { id: 'in_progress', label: 'In Progress',  color: 'text-blue-400',   dot: 'bg-blue-400' },
  { id: 'in_review',   label: 'In Review',    color: 'text-yellow-400', dot: 'bg-yellow-400' },
  { id: 'done',        label: 'Done',         color: 'text-green-400',  dot: 'bg-green-400' },
];

export default function BoardPage() {
  const { teamId } = useParams();
  const queryClient = useQueryClient();
  const { on, off } = useSocket();
  const [columns, setColumns] = useState({});
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState('todo');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', teamId],
    queryFn: () => taskAPI.getTasks({ teamId, limit: 200 }).then((r) => r.data.data),
    enabled: !!teamId,
  });

  // Organize tasks into columns
  useEffect(() => {
    if (!data) return;
    const grouped = {};
    COLUMNS.forEach((col) => {
      grouped[col.id] = data
        .filter((t) => t.status === col.id)
        .sort((a, b) => a.order - b.order);
    });
    setColumns(grouped);
  }, [data]);

  // Real-time socket listeners
  useEffect(() => {
    const handleTaskCreated = (task) => {
      queryClient.setQueryData(['tasks', teamId], (old = []) => {
        if (old.find((t) => t._id === task._id)) return old;
        return [...old, task];
      });
      toast.success(`New task: "${task.title}"`);
    };

    const handleTaskUpdated = (task) => {
      queryClient.setQueryData(['tasks', teamId], (old = []) =>
        old.map((t) => (t._id === task._id ? task : t))
      );
    };

    const handleTaskDeleted = ({ taskId }) => {
      queryClient.setQueryData(['tasks', teamId], (old = []) =>
        old.filter((t) => t._id !== taskId)
      );
    };

    const unsubCreated = on('task:created', handleTaskCreated);
    const unsubUpdated = on('task:updated', handleTaskUpdated);
    const unsubDeleted = on('task:deleted', handleTaskDeleted);

    return () => {
      unsubCreated?.();
      unsubUpdated?.();
      unsubDeleted?.();
    };
  }, [teamId, on, queryClient]);

  const bulkUpdateMutation = useMutation({
    mutationFn: taskAPI.bulkUpdate,
    onError: () => toast.error('Failed to update task position'),
  });

  const onDragEnd = useCallback((result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const srcCol = source.droppableId;
    const dstCol = destination.droppableId;

    setColumns((prev) => {
      const newCols = { ...prev };
      const srcItems = Array.from(newCols[srcCol]);
      const [moved] = srcItems.splice(source.index, 1);
      moved.status = dstCol;

      if (srcCol === dstCol) {
        srcItems.splice(destination.index, 0, moved);
        newCols[srcCol] = srcItems;
      } else {
        const dstItems = Array.from(newCols[dstCol]);
        dstItems.splice(destination.index, 0, moved);
        newCols[srcCol] = srcItems;
        newCols[dstCol] = dstItems;
      }

      // Build bulk update payload with new order values
      const updates = [
        ...newCols[dstCol].map((t, i) => ({ id: t._id, status: dstCol, order: i })),
        ...(srcCol !== dstCol ? newCols[srcCol].map((t, i) => ({ id: t._id, status: srcCol, order: i })) : []),
      ];
      bulkUpdateMutation.mutate(updates);

      return newCols;
    });
  }, [bulkUpdateMutation]);

  const filteredColumns = useCallback(() => {
    if (!searchQuery) return columns;
    const query = searchQuery.toLowerCase();
    const filtered = {};
    Object.entries(columns).forEach(([colId, tasks]) => {
      filtered[colId] = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.tags?.some((tag) => tag.includes(query))
      );
    });
    return filtered;
  }, [columns, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-muted)]">Loading board...</p>
        </div>
      </div>
    );
  }

  const displayColumns = filteredColumns();
  const totalTasks = Object.values(columns).reduce((sum, col) => sum + col.length, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Board</h1>
          <p className="text-sm text-[var(--text-muted)]">{totalTasks} tasks</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9 w-52 h-9 text-sm"
            />
          </div>

          <button
            onClick={() => { setDefaultStatus('todo'); setShowCreateTask(true); }}
            className="btn-primary h-9 text-sm"
          >
            <Plus size={16} />
            New Task
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 h-full" style={{ minWidth: `${COLUMNS.length * 300}px` }}>
            {COLUMNS.map((col) => {
              const colTasks = displayColumns[col.id] || [];
              return (
                <div key={col.id} className="flex flex-col w-72 shrink-0">
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className={clsx('w-2 h-2 rounded-full', col.dot)} />
                      <span className={clsx('text-sm font-semibold', col.color)}>{col.label}</span>
                      <span className="text-xs bg-[var(--bg-hover)] text-[var(--text-muted)] px-2 py-0.5 rounded-full font-mono">
                        {colTasks.length}
                      </span>
                    </div>
                    <button
                      onClick={() => { setDefaultStatus(col.id); setShowCreateTask(true); }}
                      className="btn-ghost p-1 opacity-0 group-hover:opacity-100 hover:opacity-100"
                      title="Add task"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Droppable column */}
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={clsx(
                          'flex-1 rounded-xl p-2 space-y-2 min-h-[200px] transition-colors duration-150',
                          snapshot.isDraggingOver
                            ? 'bg-brand-600/10 border border-brand-600/30'
                            : 'bg-[var(--bg-secondary)]/50'
                        )}
                      >
                        {colTasks.map((task, index) => (
                          <Draggable key={task._id} draggableId={task._id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <TaskCard task={task} isDragging={snapshot.isDragging} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {colTasks.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <p className="text-xs text-[var(--text-muted)]">No tasks here</p>
                            <button
                              onClick={() => { setDefaultStatus(col.id); setShowCreateTask(true); }}
                              className="text-xs text-brand-400 hover:text-brand-300 mt-1"
                            >
                              + Add a task
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {showCreateTask && (
        <CreateTaskModal
          teamId={teamId}
          defaultStatus={defaultStatus}
          onClose={() => setShowCreateTask(false)}
        />
      )}
    </div>
  );
}
