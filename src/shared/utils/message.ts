import type { ExtensionMessage, ExtensionResponse } from '@/shared/types/extension.types';

export function sendToBackground(message: ExtensionMessage): Promise<ExtensionResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: ExtensionResponse) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}
