import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function DraggableCard({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.4 : 1,
    display: 'flex',
    width: '100%',
    height: '100%',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="draggable-card-root"
      {...attributes}
      {...listeners}
    >
      <div 
        className="draggable-card-inner"
        style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1, pointerEvents: isDragging ? 'none' : 'auto', cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {children}
      </div>
    </div>
  );
}
