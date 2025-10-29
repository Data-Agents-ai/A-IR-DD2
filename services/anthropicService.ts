// services/anthropicService.ts
import { ChatMessage, Tool, ToolCall, OutputConfig } from '../types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const getHeaders = (apiKey: string) => {
    if (!apiKey) throw new Error("API Key for Anthropic is missing.");
    return {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'tool-use'
    };
};

const formatTools = (tools?: Tool[]) => {
    if (!tools || tools.length === 0) return undefined;
    return tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters,
    }));
};

const formatMessages = (history?: ChatMessage[]) => {
    const messages: any[] = [];
    history?.forEach(msg => {
        if (msg.sender === 'user') {
            const userContent: any[] = [{ type: 'text', text: msg.text }];
            if (msg.image && msg.mimeType) {
                 userContent.unshift({ type: 'image', source: { type: 'base64', media_type: msg.mimeType, data: msg.image } });
            }
            messages.push({ role: 'user', content: userContent });
        } else if (msg.sender === 'agent') {
             if (msg.toolCalls) {
                const toolUseContent = msg.toolCalls.map(tc => ({ type: 'tool_use', id: tc.id, name: tc.name, input: JSON.parse(tc.arguments) }));
                messages.push({ role: 'assistant', content: toolUseContent });
             } else {
                 messages.push({ role: 'assistant', content: msg.text });
             }
        } else if (msg.sender === 'tool' || msg.sender === 'tool_result') {
             messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: msg.toolCallId, content: msg.text }] });
        }
    });
    
    return messages;
};

export const generateContentStream = async function* (
    apiKey: string, model: string,
    systemInstruction?: string, history?: ChatMessage[], tools?: Tool[], outputConfig?: OutputConfig
) {
    const headers = getHeaders(apiKey);
    const formattedTools = formatTools(tools);
    const messages = formatMessages(history);

    let finalSystemInstruction = systemInstruction;
    if (outputConfig?.enabled) {
        const format = outputConfig.format;
        finalSystemInstruction = (systemInstruction || '') + `\n\nIMPORTANT: You MUST wrap your entire response in <${format}>...</${format}> tags. Do not add any text, explanations, or code fences before or after these tags.`;
    }

    const body = JSON.stringify({
        model,
        system: finalSystemInstruction,
        messages,
        max_tokens: 4096,
        stream: true,
        ...(formattedTools && { tools: formattedTools })
    });

    try {
        const response = await fetch(ANTHROPIC_API_URL, { method: 'POST', headers, body });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Anthropic API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Could not get reader from response body.");
        const decoder = new TextDecoder();
        let buffer = '';
        let currentToolCalls: ToolCall[] = [];
        let currentToolInput = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.substring(6);
                    try {
                        const chunk = JSON.parse(jsonStr);
                        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                            yield { response: { text: chunk.delta.text } };
                        }
                        if (chunk.type === 'content_block_start' && chunk.content_block.type === 'tool_use') {
                            currentToolCalls.push({ id: chunk.content_block.id, name: chunk.content_block.name, arguments: '' });
                        }
                        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'input_json_delta') {
                            currentToolInput += chunk.delta.partial_json;
                        }
                        if (chunk.type === 'content_block_stop') {
                            if (currentToolCalls.length > 0) {
                                const lastTool = currentToolCalls[currentToolCalls.length-1];
                                if(lastTool && lastTool.arguments === '') {
                                    lastTool.arguments = currentToolInput;
                                    currentToolInput = '';
                                }
                            }
                        }
                        if (chunk.type === 'message_stop') {
                            if (currentToolCalls.length > 0) {
                                yield { response: { toolCalls: currentToolCalls } };
                            }
                        }
                    } catch (e) { console.error("Failed to parse Anthropic stream chunk:", jsonStr, e); }
                }
            }
        }
    } catch (error) {
        console.error("Error in Anthropic generateContentStream:", error);
        yield { error: `Error from Anthropic: ${error instanceof Error ? error.message : ''}` };
    }
};

export const generateContent = async (apiKey: string, model: string, systemInstruction?: string, history?: ChatMessage[], tools?: Tool[], outputConfig?: OutputConfig): Promise<{ text: string }> => ({ text: "Not implemented" });

export const generateContentWithSearch = async (
    apiKey: string, model: string, prompt: string, systemInstruction?: string
): Promise<{ text: string; citations: { title: string; uri: string }[] }> => {
    return { text: `Error: Web Search is not supported by Anthropic.`, citations: [] };
};

export const generateImage = async (apiKey: string, prompt: string): Promise<{ image: string; error?: undefined } | { error: string; image?: undefined }> => ({ error: 'Not supported' });
export const editImage = async (apiKey: string, prompt: string, image: { mimeType: string; data: string }): Promise<{ image?: string; text?: string; error?: string }> => {
    return { error: 'Image modification is not supported by Anthropic.' };
};