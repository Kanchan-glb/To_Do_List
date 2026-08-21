import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { usePersistentLayout } from '../../hooks/usePersistentLayout';

export default function DraggableGrid({ page, defaultLayout, children, renderOverlay }) {
  const { layout, setLayout, resetLayout } = usePersistentLayout(page, defaultLayout);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Prevents accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = layout.indexOf(active.id);
      const newIndex = layout.indexOf(over.id);
      setLayout(arrayMove(layout, oldIndex, newIndex));
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext 
        items={layout} 
        strategy={rectSortingStrategy}
      >
        {children({ layout, resetLayout })}
      </SortableContext>
      
      <DragOverlay dropAnimation={{ duration: 300, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeId ? (
          <div style={{ opacity: 0.9, transform: 'scale(1.02)', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', cursor: 'grabbing', borderRadius: '20px' }}>
            {renderOverlay ? renderOverlay(activeId) : null}
          </div>
        ) : null}
      </DragOverlay>

      <style>{`
        /* Force internal wrapper and its child to stretch to 100% height */
        .draggable-card-inner > * {
          height: 100% !important;
          flex: 1 1 auto;
        }

        /* 
          Target the top 3 cards specifically: 
          Fix their height to 340px so they never stretch based on content,
          and make their internal lists scrollable.
        */
        .db-task-preview-grid .draggable-card-root {
          height: 340px;
        }
        .db-task-preview-grid .db-preview-section {
          display: flex;
          flex-direction: column;
        }
        .db-task-preview-grid .db-preview-list {
          flex: 1;
          overflow-y: auto;
          min-height: 0;
          padding-right: 4px;
        }
        
        /* Custom scrollbar for the preview list */
        .db-task-preview-grid .db-preview-list::-webkit-scrollbar {
          width: 4px;
        }
        .db-task-preview-grid .db-preview-list::-webkit-scrollbar-thumb {
          background-color: var(--border-light, #e2e8f0);
          border-radius: 4px;
        }
      `}</style>
    </DndContext>
  );
}
