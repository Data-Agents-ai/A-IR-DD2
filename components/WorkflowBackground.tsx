import React from 'react';
import { BackgroundVariant } from 'reactflow';

interface WorkflowBackgroundProps {
  variant?: BackgroundVariant;
  gap?: number;
  size?: number;
  color?: string;
}

export const WorkflowBackground: React.FC<WorkflowBackgroundProps> = ({
  variant = BackgroundVariant.Dots,
  gap = 20,
  size = 2,
  color = '#0066ff40',
}) => {
  return (
    <div className="workflow-background">
      <style jsx>{`
        .workflow-background {
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(circle at 25% 25%, #0066ff20 2px, transparent 2px),
            radial-gradient(circle at 75% 75%, #00ff8820 2px, transparent 2px),
            linear-gradient(45deg, #000a1a 0%, #001122 50%, #000a1a 100%);
          background-size: ${gap}px ${gap}px, ${gap}px ${gap}px, 100% 100%;
          opacity: 0.8;
        }
        
        .workflow-background::before {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 98px,
              ${color} 100px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 98px,
              ${color} 100px
            );
          opacity: 0.3;
        }
      `}</style>
    </div>
  );
};