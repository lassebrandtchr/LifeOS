"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { bucketOrder, buckets, type Bucket } from "@/features/tasks/constants";
import type { Task, TasksByBucket } from "@/features/tasks/types";
import { TaskCard } from "@/components/tasks/task-card";
import { moveTask, setTaskStatus } from "@/features/tasks/actions";

/** Én droppable kolonne (I dag / Denne uge / Senere). */
function Column({
  bucket,
  tasks,
  onComplete,
}: {
  bucket: Bucket;
  tasks: Task[];
  onComplete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: bucket });

  return (
    <div className="flex min-w-0 flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold">{buckets[bucket].label}</h3>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-32 flex-1 flex-col gap-2.5 rounded-2xl border border-dashed border-transparent p-2 transition-colors",
          isOver && "border-primary/40 bg-primary/5",
        )}
      >
        {tasks.map((task) => (
          <DraggableCard
            key={task.id}
            task={task}
            bucket={bucket}
            onComplete={onComplete}
          />
        ))}
        {tasks.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Træk opgaver hertil
          </p>
        )}
      </div>
    </div>
  );
}

/** Et trækbart kort. */
function DraggableCard({
  task,
  bucket,
  onComplete,
}: {
  task: Task;
  bucket: Bucket;
  onComplete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id, data: { bucket } });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...attributes}
      {...listeners}
      className="touch-none"
    >
      <TaskCard task={task} onComplete={onComplete} />
    </motion.div>
  );
}

/**
 * TaskBoard – Kanban-agtigt board med drag & drop mellem I dag / Denne uge /
 * Senere. Opdaterer optimistisk i UI'et og gemmer ændringen i databasen.
 */
export function TaskBoard({ initial }: { initial: TasksByBucket }) {
  const [data, setData] = React.useState<TasksByBucket>(initial);
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);

  // Synk med server-data efter en handling (revalidate).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setData(initial), [initial]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor),
  );

  function findTask(id: string): { task: Task; bucket: Bucket } | null {
    for (const b of bucketOrder) {
      const task = data[b].find((t) => t.id === id);
      if (task) return { task, bucket: b };
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const found = findTask(String(event.active.id));
    setActiveTask(found?.task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const id = String(active.id);
    const from = (active.data.current?.bucket as Bucket) ?? null;
    const to = over.id as Bucket;
    if (!from || !bucketOrder.includes(to) || from === to) return;

    const moved = data[from].find((t) => t.id === id);
    if (!moved) return;

    // Optimistisk flytning
    setData((prev) => ({
      ...prev,
      [from]: prev[from].filter((t) => t.id !== id),
      [to]: [...prev[to], { ...moved, bucket: to }],
    }));

    void moveTask(id, to, Date.now());
  }

  function handleComplete(id: string) {
    // Optimistisk: fjern fra board'et med det samme.
    setData((prev) => {
      const next = { ...prev };
      for (const b of bucketOrder) next[b] = next[b].filter((t) => t.id !== id);
      return next;
    });
    void setTaskStatus(id, "done");
  }

  return (
    <DndContext
      id="task-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {bucketOrder.map((bucket) => (
          <Column
            key={bucket}
            bucket={bucket}
            tasks={data[bucket]}
            onComplete={handleComplete}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
