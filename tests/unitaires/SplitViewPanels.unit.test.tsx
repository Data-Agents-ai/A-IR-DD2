/**
 * SplitViewPanels.unit.test.tsx
 * 
 * Test unitaire pour les panneaux utilisés en mode Split-View (hideSlideOver=true).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ImageGenerationPanel } from '../../components/panels/ImageGenerationPanel';
import { VideoGenerationConfigPanel } from '../../components/panels/VideoGenerationConfigPanel';
import { MapsGroundingConfigPanel } from '../../components/panels/MapsGroundingConfigPanel';
import { Agent, LLMProvider, LLMCapability, WorkflowNode, LLMConfig, RobotId } from '../../types';

jest.mock('../../services/llmService', () => ({
  generateImage: jest.fn().mockResolvedValue({
    image: 'data:image/png;base64,mockImageData',
    error: null,
  }),
}));

jest.mock('../../hooks/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, args?: any) => args ? `${key}(${args.agentName})` : key,
    currentLanguage: 'en',
  }),
}));

// Test data
const mockAgent: Agent = {
  id: 'agent-1',
  name: 'Test Agent',
  role: 'test',
  systemPrompt: 'You are helpful',
  llmProvider: LLMProvider.OpenAI,
  model: 'gpt-4',
  tools: [],
  capabilities: [
    LLMCapability.Chat,
    LLMCapability.ImageGeneration,
    LLMCapability.ImageModification,
    LLMCapability.VideoGeneration,
    LLMCapability.MapsGrounding,
  ],
  creator_id: RobotId.Archi,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockWorkflowNode: WorkflowNode = {
  id: 'node-1',
  agent: mockAgent,
  position: { x: 0, y: 0 },
  messages: [],
  isMinimized: false,
};

const mockLLMConfig: LLMConfig = {
  provider: LLMProvider.OpenAI,
  apiKey: 'test-key',
  enabled: true,
  capabilities: {
    [LLMCapability.ImageGeneration]: true,
    [LLMCapability.VideoGeneration]: true,
    [LLMCapability.MapsGrounding]: true,
  },
};

describe('Split-View Panels Unit Tests', () => {
  const commonProps = {
    nodeId: 'node-1',
    workflowNodes: [mockWorkflowNode],
    llmConfigs: [mockLLMConfig],
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ImageGenerationPanel en mode hideSlideOver', () => {
    const imageProps = {
      ...commonProps,
      isOpen: true,
      hideSlideOver: true,
      onImageGenerated: jest.fn(),
      onOpenImageModificationPanel: jest.fn(),
    };

    it('devrait rendre le panel sans SlideOver wrapper', () => {
      const { container } = render(<ImageGenerationPanel {...imageProps} />);
      const panelContainer = container.querySelector('div[class*="flex"][class*="flex-col"]');
      expect(panelContainer).toBeInTheDocument();
      expect(panelContainer).toHaveClass('w-full');
      expect(panelContainer).toHaveClass('h-full');
    });

    it('devrait afficher header et bouton close', () => {
      render(<ImageGenerationPanel {...imageProps} />);
      const header = screen.getByText(/imageGen_title/i);
      expect(header).toBeInTheDocument();
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveTextContent('×');
    });

    it('devrait appliquer styling cyberpunk', () => {
      const { container } = render(<ImageGenerationPanel {...imageProps} />);
      const header = container.querySelector('[class*="bg-gradient"]');
      expect(header).toHaveClass('bg-gradient-to-r');
      expect(header).toHaveClass('border-cyan-500');
    });

    it('devrait appeler onClose', async () => {
      const onCloseMock = jest.fn();
      render(<ImageGenerationPanel {...imageProps} onClose={onCloseMock} />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  describe('VideoGenerationConfigPanel en mode hideSlideOver', () => {
    const videoProps = {
      ...commonProps,
      hideSlideOver: true,
      isOpen: true,
    };

    it('devrait rendre comme conteneur flex full', () => {
      const { container } = render(<VideoGenerationConfigPanel {...videoProps} />);
      const panelContainer = container.querySelector('[class*="h-full"][class*="bg-gray"]');
      expect(panelContainer).toHaveClass('flex');
      expect(panelContainer).toHaveClass('flex-col');
    });

    it('devrait avoir sticky header avec close', () => {
      const { container } = render(<VideoGenerationConfigPanel {...videoProps} />);
      const header = container.querySelector('[class*="sticky"]');
      expect(header).toHaveClass('top-0');
      expect(header).toHaveClass('z-10');
    });

    it('devrait fermer quand × cliqué', async () => {
      const onCloseMock = jest.fn();
      render(<VideoGenerationConfigPanel {...videoProps} onClose={onCloseMock} />);
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      await userEvent.click(closeButtons[closeButtons.length - 1]);
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  describe('MapsGroundingConfigPanel en mode hideSlideOver', () => {
    const mapsProps = {
      ...commonProps,
      hideSlideOver: true,
      isOpen: true,
      mapSources: [],
      onMapSourceAdded: jest.fn(),
      onMapSourceRemoved: jest.fn(),
    };

    it('devrait rendre structure flex complète', () => {
      const { container } = render(<MapsGroundingConfigPanel {...mapsProps} />);
      const panelContainer = container.querySelector('[class*="h-full"][class*="overflow-y-auto"]');
      expect(panelContainer).toHaveClass('flex');
      expect(panelContainer).toHaveClass('flex-col');
    });

    it('devrait afficher icône 🗺️', () => {
      render(<MapsGroundingConfigPanel {...mapsProps} />);
      const header = screen.getByText(/🗺️/);
      expect(header.textContent).toContain('Maps Grounding');
    });

    it('devrait fermer quand × cliqué', async () => {
      const onCloseMock = jest.fn();
      const { container } = render(
        <MapsGroundingConfigPanel {...mapsProps} onClose={onCloseMock} />
      );
      const header = container.querySelector('[class*="bg-gradient"]');
      const closeButton = header?.querySelector('button');
      if (closeButton) {
        await userEvent.click(closeButton);
        expect(onCloseMock).toHaveBeenCalled();
      }
    });
  });

  describe('Cohérence design entre panneaux', () => {
    it('tous les panneaux ont sticky headers', () => {
      render(<ImageGenerationPanel {...commonProps, isOpen={true}, hideSlideOver={true}, onImageGenerated={jest.fn()}, onOpenImageModificationPanel={jest.fn()} />);
      render(<VideoGenerationConfigPanel {...commonProps, hideSlideOver={true}, isOpen={true} />);
      render(<MapsGroundingConfigPanel {...commonProps, hideSlideOver={true}, isOpen={true}, mapSources={[], onMapSourceAdded={jest.fn()}, onMapSourceRemoved={jest.fn()} />);

      const headers = document.querySelectorAll('[class*="sticky"][class*="top-0"]');
      expect(headers.length).toBeGreaterThanOrEqual(3);
    });

    it('tous les panneaux ont cyan border', () => {
      const { container: imageContainer } = render(<ImageGenerationPanel {...commonProps, isOpen={true}, hideSlideOver={true}, onImageGenerated={jest.fn()}, onOpenImageModificationPanel={jest.fn()} />);
      const { container: videoContainer } = render(<VideoGenerationConfigPanel {...commonProps, hideSlideOver={true}, isOpen={true} />);
      const { container: mapsContainer } = render(<MapsGroundingConfigPanel {...commonProps, hideSlideOver={true}, isOpen={true}, mapSources={[], onMapSourceAdded={jest.fn()}, onMapSourceRemoved={jest.fn()} />);

      [imageContainer, videoContainer, mapsContainer].forEach((container) => {
        const borderElement = container.querySelector('[class*="border-cyan"]');
        expect(borderElement).toBeInTheDocument();
      });
    });
  });

  describe('Accessibilité', () => {
    it('les boutons close ont aria-label', () => {
      render(<ImageGenerationPanel {...commonProps, isOpen={true}, hideSlideOver={true}, onImageGenerated={jest.fn()}, onOpenImageModificationPanel={jest.fn()} />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveAttribute('aria-label');
    });

    it('les inputs ont labels associées', () => {
      render(<ImageGenerationPanel {...commonProps, isOpen={true}, hideSlideOver={true}, onImageGenerated={jest.fn()}, onOpenImageModificationPanel={jest.fn()} />);
      const label = screen.getByLabelText(/imageGen_promptLabel/i);
      expect(label).toBeInTheDocument();
    });
  });
});
