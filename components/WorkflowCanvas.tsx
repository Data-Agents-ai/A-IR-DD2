import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, HistoryConfig, LLMConfig, WorkflowNode } from '../types';
import { AgentNode } from './AgentNode';
import { useLocalization } from '../hooks/useLocalization';

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  llmConfigs: LLMConfig[];
  onDeleteNode: (nodeId: string) => void;
  onUpdateNodeMessages: (nodeId: string, messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  onUpdateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  onToggleNodeMinimize: (nodeId: string) => void;
  onOpenImagePanel: (nodeId: string) => void;
  onOpenImageModificationPanel: (nodeId: string, sourceImage: string, mimeType: string) => void;
  onOpenFullscreen: (sourceImage: string, mimeType: string) => void;
}

export const WorkflowCanvas = ({ nodes, llmConfigs, onDeleteNode, onUpdateNodeMessages, onUpdateNodePosition, onToggleNodeMinimize, onOpenImagePanel, onOpenImageModificationPanel, onOpenFullscreen }: WorkflowCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const { t } = useLocalization();

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        
        const rect = canvasElement.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = 1.1;
        const oldZoom = zoom;
        const newZoomUnclamped = e.deltaY > 0 ? oldZoom / zoomFactor : oldZoom * zoomFactor;
        const newZoom = Math.min(Math.max(newZoomUnclamped, 0.2), 2);

        // Adjust pan to zoom towards the cursor position
        const newPanX = mouseX - (mouseX - pan.x) * (newZoom / oldZoom);
        const newPanY = mouseY - (mouseY - pan.y) * (newZoom / oldZoom);
        
        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
    };

    canvasElement.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
        canvasElement.removeEventListener('wheel', handleWheel);
    };
  }, [pan, zoom]);

  const handleNodeDragStart = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const startX = (e.clientX - pan.x) / zoom;
    const startY = (e.clientY - pan.y) / zoom;
    
    setDraggingNode({
        nodeId,
        offsetX: startX - node.position.x,
        offsetY: startY - node.position.y,
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !draggingNode) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNode) {
        const newX = (e.clientX - pan.x) / zoom - draggingNode.offsetX;
        const newY = (e.clientY - pan.y) / zoom - draggingNode.offsetY;
        onUpdateNodePosition(draggingNode.nodeId, { x: newX, y: newY });
    } else if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUpOrLeave = () => {
    setIsPanning(false);
    setDraggingNode(null);
  };

  if (nodes.length === 0) {
    return (
        <div className="flex items-center justify-center h-full w-full">
            <div className="text-center text-gray-600">
                <h2 className="text-2xl font-semibold">{t('workflow_empty_title')}</h2>
                <p className="mt-2">{t('workflow_empty_cta')}</p>
            </div>
        </div>
    );
  }

  const cursorClass = isPanning || draggingNode ? 'cursor-grabbing' : 'cursor-grab';

  return (
    <div 
        ref={canvasRef}
        className={`relative w-full h-full overflow-hidden ${cursorClass}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
    >
      <div 
        className="absolute top-0 left-0"
        style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
        }}
      >
        {nodes.map((node) => (
            <AgentNode 
                key={node.id} 
                node={node}
                llmConfigs={llmConfigs}
                onDelete={onDeleteNode}
                onUpdateMessages={onUpdateNodeMessages}
                onToggleMinimize={onToggleNodeMinimize}
                onOpenImagePanel={onOpenImagePanel}
                onOpenImageModificationPanel={onOpenImageModificationPanel}
                onOpenFullscreen={onOpenFullscreen}
                onDragStart={handleNodeDragStart}
            />
        ))}
      </div>
    </div>
  );
};