// utils/textUtils.ts
import { ChatMessage } from "../types";

// A simple approximation for token counting.
// Models like GPT use Byte-Pair Encoding, which is complex to replicate perfectly.
// A common heuristic is that 1 token is roughly 4 characters in English text.
const CHARS_PER_TOKEN = 4;

export const countChars = (messages: ChatMessage[]): number => {
    return messages.reduce((sum, msg) => sum + msg.text.length, 0);
};

export const countWords = (messages: ChatMessage[]): number => {
    return messages.reduce((sum, msg) => {
        const words = msg.text.match(/\b\w+\b/g) || [];
        return sum + words.length;
    }, 0);
};

export const countTokens = (messages: ChatMessage[]): number => {
    const totalChars = countChars(messages);
    return Math.ceil(totalChars / CHARS_PER_TOKEN);
};

export const countSentences = (messages: ChatMessage[]): number => {
    return messages.reduce((sum, msg) => {
        if (!msg.text) return sum;
        // Split by sentence-ending punctuation and filter out empty strings.
        // This is an approximation and works for most simple cases.
        const sentences = msg.text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        return sum + sentences.length;
    }, 0);
};

export const countMessages = (messages: ChatMessage[]): number => {
    return messages.length;
};
