"use-client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { TranscriptItem } from "@/app/types";
import Image from "next/image";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { DownloadIcon, ClipboardCopyIcon } from "@radix-ui/react-icons";
import { GuardrailChip } from "./GuardrailChip";
import { CompactImageUpload } from "./CompactImageUpload";
import { downloadImageFromUrl, downloadImageFromBase64, downloadImageDirectly, getImageFileName } from "@/app/lib/downloadUtils";

export interface TranscriptProps {
  userText: string;
  setUserText: (val: string) => void;
  onSendMessage: () => void;
  canSend: boolean;
  downloadRecording: () => void;
  onImageAnalyzed?: (result: any) => void;
  translations: any;
}

function Transcript({
  userText,
  setUserText,
  onSendMessage,
  canSend,
  downloadRecording,
  onImageAnalyzed,
  translations,
}: TranscriptProps) {
  const { transcriptItems, toggleTranscriptItemExpand } = useTranscript();
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [prevLogs, setPrevLogs] = useState<TranscriptItem[]>([]);
  const [justCopied, setJustCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function scrollToBottom() {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }

  useEffect(() => {
    const hasNewMessage = transcriptItems.length > prevLogs.length;
    const hasUpdatedMessage = transcriptItems.some((newItem, index) => {
      const oldItem = prevLogs[index];
      return (
        oldItem &&
        (newItem.title !== oldItem.title || newItem.data !== oldItem.data)
      );
    });

    if (hasNewMessage || hasUpdatedMessage) {
      scrollToBottom();
    }

    setPrevLogs(transcriptItems);
  }, [transcriptItems]);

  // Autofocus on text box input on load
  useEffect(() => {
    if (canSend && inputRef.current) {
      inputRef.current.focus();
    }
  }, [canSend]);

  const handleCopyTranscript = async () => {
    if (!transcriptRef.current) return;
    try {
      await navigator.clipboard.writeText(transcriptRef.current.innerText);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy transcript:", error);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-white min-h-0 rounded-xl">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between px-6 py-3 sticky top-0 z-10 text-base border-b bg-white rounded-t-xl">
          <span className="font-semibold">Transcript</span>
          <div className="flex gap-x-2">
            <button
              onClick={handleCopyTranscript}
              className="w-24 text-sm px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300 flex items-center justify-center gap-x-1"
            >
              <ClipboardCopyIcon />
              {justCopied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={downloadRecording}
              className="w-40 text-sm px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300 flex items-center justify-center gap-x-1"
            >
              <DownloadIcon />
              <span>Download Audio</span>
            </button>
          </div>
        </div>

        {/* Transcript Content */}
        <div
          ref={transcriptRef}
          className="overflow-auto p-4 flex flex-col gap-y-4 h-full"
        >
          {[...transcriptItems]
            .sort((a, b) => a.createdAtMs - b.createdAtMs)
            .map((item) => {
              const {
                itemId,
                type,
                role,
                data,
                expanded,
                timestamp,
                title = "",
                isHidden,
                guardrailResult,
              } = item;

            if (isHidden) {
              return null;
            }

            if (type === "MESSAGE") {
              const isUser = role === "user";
              const containerClasses = `flex justify-end flex-col ${
                isUser ? "items-end" : "items-start"
              }`;
              const bubbleBase = `max-w-lg p-3 ${
                isUser ? "bg-gray-900 text-gray-100" : "bg-gray-100 text-black"
              }`;
              const isBracketedMessage =
                title.startsWith("[") && title.endsWith("]");
              const messageStyle = isBracketedMessage
                ? 'italic text-gray-400'
                : '';
              const displayTitle = isBracketedMessage
                ? title.slice(1, -1)
                : title;

              return (
                <div key={itemId} className={containerClasses}>
                  <div className="max-w-lg">
                    <div
                      className={`${bubbleBase} rounded-t-xl ${
                        guardrailResult ? "" : "rounded-b-xl"
                      }`}
                    >
                      <div
                        className={`text-xs ${
                          isUser ? "text-gray-400" : "text-gray-500"
                        } font-mono`}
                      >
                        {timestamp}
                      </div>
                      <div className={`whitespace-pre-wrap ${messageStyle}`}>
                        <ReactMarkdown>{displayTitle}</ReactMarkdown>
                        {/* Debug: Show data object when it exists */}
                        {data && (
                          <div className="text-xs text-red-600 bg-red-50 p-1 rounded mt-1">
                            DEBUG: data exists - {typeof data} - hasImageUrl: {data?.imageUrl ? 'YES' : 'NO'}
                          </div>
                        )}
                        {/* Check if this is a function call output with an image */}
                        {typeof data === 'object' && data?.imageUrl && (
                          <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                            <div className="text-xs text-gray-600 mb-2">🎨 Imagen generada:</div>
                            <div className="rounded-lg overflow-hidden border border-gray-300 bg-white">
                              <img 
                                src={data.imageUrl} 
                                alt={data.originalPrompt || "Generated image"}
                                className="cursor-pointer hover:opacity-90 transition-opacity"
                                style={{ width: '200px', height: 'auto', maxHeight: '200px', objectFit: 'contain' }}
                                onClick={() => window.open(data.imageUrl, '_blank')}
                                title="Haz clic para ver tamaño completo"
                                onError={(e) => {
                                  console.error('Error loading image:', e);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                            {data.revisedPrompt && (
                              <div className="mt-2 text-xs text-gray-600 italic">
                                "{data.revisedPrompt}"
                              </div>
                            )}
                            <div className="mt-1 flex items-center gap-3 text-xs">
                              <a 
                                href={data.imageUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:underline"
                              >
                                {translations?.viewFullImage || 'Ver imagen completa'} ↗
                              </a>
                              <button
                                onClick={async () => {
                                  try {
                                    await downloadImageFromUrl(
                                      data.imageUrl, 
                                      getImageFileName(data.originalPrompt, 'generated')
                                    );
                                  } catch (error) {
                                    console.log('Primary download failed, trying direct method');
                                    downloadImageDirectly(data.imageUrl);
                                  }
                                }}
                                className="flex items-center gap-1 text-green-600 hover:text-green-800 hover:underline transition-colors"
                                title={translations?.downloadImage || 'Descargar imagen'}
                              >
                                <DownloadIcon className="w-3 h-3" />
                                {translations?.downloadImage || 'Descargar imagen'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Check if this is an uploaded image */}
                        {typeof data === 'object' && data?.imageData && data?.isUploadedImage && (
                          <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                            <div className="text-xs text-blue-600 mb-2">
                              📷 Imagen subida: {data.fileName || 'imagen'} 
                              {data.analysisType && ` (${data.analysisType})`}
                            </div>
                            <div className="rounded-lg overflow-hidden border border-blue-200 bg-white">
                              <img 
                                src={data.imageData} 
                                alt="Uploaded image"
                                className="cursor-pointer hover:opacity-90 transition-opacity"
                                style={{ width: '200px', height: 'auto', maxHeight: '200px', objectFit: 'contain' }}
                                onClick={() => window.open(data.imageData, '_blank')}
                                title="Haz clic para ver tamaño completo"
                                onError={(e) => {
                                  console.error('Error loading uploaded image:', data.imageData?.substring(0, 50));
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-xs">
                              <a 
                                href={data.imageData} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:underline"
                              >
                                {translations?.viewFullImage || 'Ver imagen completa'} ↗
                              </a>
                              <button
                                onClick={() => downloadImageFromBase64(
                                  data.imageData, 
                                  getImageFileName(data.fileName, 'uploaded')
                                )}
                                className="flex items-center gap-1 text-green-600 hover:text-green-800 hover:underline transition-colors"
                                title={translations?.downloadImage || 'Descargar imagen'}
                              >
                                <DownloadIcon className="w-3 h-3" />
                                {translations?.downloadImage || 'Descargar imagen'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {guardrailResult && (
                      <div className="bg-gray-200 px-3 py-2 rounded-b-xl">
                        <GuardrailChip guardrailResult={guardrailResult} />
                      </div>
                    )}
                  </div>
                </div>
              );
            } else if (type === "BREADCRUMB") {
              return (
                <div
                  key={itemId}
                  className="flex flex-col justify-start items-start text-gray-500 text-sm"
                >
                  <span className="text-xs font-mono">{timestamp}</span>
                  <div
                    className={`whitespace-pre-wrap flex items-center font-mono text-sm text-gray-800 ${
                      data ? "cursor-pointer" : ""
                    }`}
                    onClick={() => data && toggleTranscriptItemExpand(itemId)}
                  >
                    {data && (
                      <span
                        className={`text-gray-400 mr-1 transform transition-transform duration-200 select-none font-mono ${
                          expanded ? "rotate-90" : "rotate-0"
                        }`}
                      >
                        ▶
                      </span>
                    )}
                    {title}
                  </div>
                  {expanded && data && (
                    <div className="text-gray-800 text-left">
                      {/* Check if this is an image generation result */}
                      {typeof data === 'object' && data?.imageUrl ? (
                        <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                          <div className="text-xs text-blue-700 mb-2">🖼️ Resultado de función: Imagen generada</div>
                          <div className="rounded-lg overflow-hidden border border-blue-200 bg-white">
                            <img 
                              src={data.imageUrl} 
                              alt={data.originalPrompt || "Generated image"}
                              className="cursor-pointer hover:opacity-90 transition-opacity"
                              style={{ width: '200px', height: 'auto', maxHeight: '200px', objectFit: 'contain' }}
                              onClick={() => window.open(data.imageUrl, '_blank')}
                              title="Haz clic para ver tamaño completo"
                              onError={(e) => {
                                console.error('Error loading breadcrumb image:', e);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                          {data.revisedPrompt && (
                            <div className="mt-2 text-xs text-gray-600 italic">
                              "{data.revisedPrompt}"
                            </div>
                          )}
                          <div className="mt-1 flex items-center gap-3 text-xs">
                            <a 
                              href={data.imageUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 hover:underline"
                            >
                              {translations?.viewFullImage || 'Abrir imagen completa'} ↗
                            </a>
                            <button
                              onClick={() => downloadImageFromUrl(
                                data.imageUrl, 
                                getImageFileName(data.originalPrompt, 'generated')
                              )}
                              className="flex items-center gap-1 text-green-600 hover:text-green-800 hover:underline transition-colors"
                              title={translations?.downloadImage || 'Descargar imagen'}
                            >
                              <DownloadIcon className="w-3 h-3" />
                              {translations?.downloadImage || 'Descargar imagen'}
                            </button>
                          </div>
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">Ver datos técnicos</summary>
                            <pre className="border-l-2 ml-1 border-gray-200 whitespace-pre-wrap break-words font-mono text-xs mb-2 mt-2 pl-2">
                              {JSON.stringify(data, null, 2)}
                            </pre>
                          </details>
                        </div>
                      ) : typeof data === 'object' && data?.imageData && data?.isUploadedImage ? (
                        <div className="mt-3 p-2 bg-green-50 rounded-lg">
                          <div className="text-xs text-green-700 mb-2">
                            📷 Imagen subida: {data.fileName || 'imagen'} 
                            {data.analysisType && ` (${data.analysisType})`}
                          </div>
                          <div className="rounded-lg overflow-hidden border border-green-200 bg-white">
                            <img 
                              src={data.imageData} 
                              alt="Uploaded image"
                              className="cursor-pointer hover:opacity-90 transition-opacity"
                              style={{ width: '200px', height: 'auto', maxHeight: '200px', objectFit: 'contain' }}
                              onClick={() => window.open(data.imageData, '_blank')}
                              title="Haz clic para ver tamaño completo"
                              onError={(e) => {
                                console.error('Error loading uploaded breadcrumb image:', data.imageData?.substring(0, 50));
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs">
                            <a 
                              href={data.imageData} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 hover:underline"
                            >
                              {translations?.viewFullImage || 'Abrir imagen completa'} ↗
                            </a>
                            <button
                              onClick={() => downloadImageFromBase64(
                                data.imageData, 
                                getImageFileName(data.fileName, 'uploaded')
                              )}
                              className="flex items-center gap-1 text-green-600 hover:text-green-800 hover:underline transition-colors"
                              title={translations?.downloadImage || 'Descargar imagen'}
                            >
                              <DownloadIcon className="w-3 h-3" />
                              {translations?.downloadImage || 'Descargar imagen'}
                            </button>
                          </div>
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">Ver datos técnicos</summary>
                            <pre className="border-l-2 ml-1 border-gray-200 whitespace-pre-wrap break-words font-mono text-xs mb-2 mt-2 pl-2">
                              {JSON.stringify(data, null, 2)}
                            </pre>
                          </details>
                        </div>
                      ) : (
                        <pre className="border-l-2 ml-1 border-gray-200 whitespace-pre-wrap break-words font-mono text-xs mb-2 mt-2 pl-2">
                          {JSON.stringify(data, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            } else {
              // Fallback if type is neither MESSAGE nor BREADCRUMB
              return (
                <div
                  key={itemId}
                  className="flex justify-center text-gray-500 text-sm italic font-mono"
                >
                  Unknown item type: {type}{" "}
                  <span className="ml-2 text-xs">{timestamp}</span>
                </div>
              );
            }
          })}
        </div>
      </div>

      <div className="p-4 flex items-center gap-x-2 flex-shrink-0 border-t border-gray-200">
        <input
          ref={inputRef}
          type="text"
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSend) {
              onSendMessage();
            }
          }}
          className="flex-1 px-4 py-2 focus:outline-none"
          placeholder={translations?.typeMessage || "Type a message..."}
        />
        
        {onImageAnalyzed && (
          <CompactImageUpload
            onImageAnalyzed={onImageAnalyzed}
            isConnected={canSend}
            translations={translations}
          />
        )}
        
        <button
          onClick={onSendMessage}
          disabled={!canSend || !userText.trim()}
          className="bg-gray-900 text-white rounded-full px-2 py-2 disabled:opacity-50"
        >
          <Image src="arrow.svg" alt="Send" width={24} height={24} />
        </button>
      </div>
    </div>
  );
}

export default Transcript;
