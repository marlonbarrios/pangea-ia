"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";


// UI components
import Transcript from "./components/Transcript";
import Events from "./components/Events";
import BottomToolbar from "./components/BottomToolbar";

// Types
import { SessionStatus } from "@/app/types";
import type { RealtimeAgent } from '@openai/agents/realtime';

// Context providers & hooks
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useRealtimeSession } from "./hooks/useRealtimeSession";
import { createModerationGuardrail } from "@/app/agentConfigs/guardrails";

// Agent configs
import { allAgentSets, defaultAgentSetKey } from "@/app/agentConfigs";
import { decolonialConsultantScenario } from "@/app/agentConfigs/decolonialConsultant";
import { thermometerColonialityScenario } from "@/app/agentConfigs/thermometerColoniality";
import { valladolidDialogueScenario } from "@/app/agentConfigs/valladolidDialogue";

// Map used by connect logic for scenarios defined via the SDK.
const sdkScenarioMap: Record<string, RealtimeAgent[]> = {
  Pangea_IA: decolonialConsultantScenario,
  thermometerColoniality: thermometerColonialityScenario,
  valladolidDialogue: valladolidDialogueScenario,
};

import useAudioDownload from "./hooks/useAudioDownload";
import { useHandleSessionHistory } from "./hooks/useHandleSessionHistory";

function App() {
  const searchParams = useSearchParams()!;

  // ---------------------------------------------------------------------
  // Codec selector – lets you toggle between wide-band Opus (48 kHz)
  // and narrow-band PCMU/PCMA (8 kHz) to hear what the agent sounds like on
  // a traditional phone line and to validate ASR / VAD behaviour under that
  // constraint.
  //
  // We read the `?codec=` query-param and rely on the `changePeerConnection`
  // hook (configured in `useRealtimeSession`) to set the preferred codec
  // before the offer/answer negotiation.
  // ---------------------------------------------------------------------
  const urlCodec = searchParams.get("codec") || "opus";

  // Agents SDK doesn't currently support codec selection so it is now forced 
  // via global codecPatch at module load 

  const {
    addTranscriptMessage,
    addTranscriptBreadcrumb,
  } = useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();

  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<
    RealtimeAgent[] | null
  >(null);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  // Ref to identify whether the latest agent switch came from an automatic handoff
  const handoffTriggeredRef = useRef(false);

  const sdkAudioElement = React.useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const el = document.createElement('audio');
    el.autoplay = true;
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }, []);

  // Attach SDK audio element once it exists (after first render in browser)
  useEffect(() => {
    if (sdkAudioElement && !audioElementRef.current) {
      audioElementRef.current = sdkAudioElement;
    }
  }, [sdkAudioElement]);

  const {
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    interrupt,
    mute,
  } = useRealtimeSession({
    onConnectionChange: (s) => setSessionStatus(s as SessionStatus),
    onAgentHandoff: (agentName: string) => {
      handoffTriggeredRef.current = true;
      setSelectedAgentName(agentName);
    },
  });

  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");

  const [isEventsPaneExpanded, setIsEventsPaneExpanded] =
    useState<boolean>(true);
  const [userText, setUserText] = useState<string>("");
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(
    () => {
      if (typeof window === 'undefined') return true;
      const stored = localStorage.getItem('audioPlaybackEnabled');
      return stored ? stored === 'true' : true;
    },
  );
  const [selectedLanguage, setSelectedLanguage] = useState<string>('español');
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate language from localStorage after component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedLanguage');
      if (stored) {
        setSelectedLanguage(stored);
      }
      setIsHydrated(true);
    }
  }, []);


  // Initialize the recording hook.
  const { startRecording, stopRecording, downloadRecording } =
    useAudioDownload();

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    try {
      sendEvent(eventObj);
      logClientEvent(eventObj, eventNameSuffix);
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }
  };

  useHandleSessionHistory();

  useEffect(() => {
    let finalAgentConfig = searchParams.get("agentConfig");
    if (!finalAgentConfig || !allAgentSets[finalAgentConfig]) {
      finalAgentConfig = defaultAgentSetKey;
      const url = new URL(window.location.toString());
      url.searchParams.set("agentConfig", finalAgentConfig);
      window.location.replace(url.toString());
      return;
    }

    const agents = allAgentSets[finalAgentConfig];
    const agentKeyToUse = agents[0]?.name || "";

    setSelectedAgentName(agentKeyToUse);
    setSelectedAgentConfigSet(agents);
  }, [searchParams]);

  useEffect(() => {
    if (selectedAgentName && sessionStatus === "DISCONNECTED") {
      connectToRealtime();
    }
  }, [selectedAgentName]);

  useEffect(() => {
    if (
      sessionStatus === "CONNECTED" &&
      selectedAgentConfigSet &&
      selectedAgentName
    ) {
      const currentAgent = selectedAgentConfigSet.find(
        (a) => a.name === selectedAgentName
      );
      addTranscriptBreadcrumb(`Agent: ${selectedAgentName}`, currentAgent);
      updateSession(!handoffTriggeredRef.current);
      // Reset flag after handling so subsequent effects behave normally
      handoffTriggeredRef.current = false;
    }
  }, [selectedAgentConfigSet, selectedAgentName, sessionStatus]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      updateSession();
    }
  }, [isPTTActive]);

  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    const tokenResponse = await fetch("/api/session");
    const data = await tokenResponse.json();
    logServerEvent(data, "fetch_session_token_response");

    if (!data.client_secret?.value) {
      logClientEvent(data, "error.no_ephemeral_key");
      console.error("No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      return null;
    }

    return data.client_secret.value;
  };

  const connectToRealtime = async () => {
    const agentSetKey = searchParams.get("agentConfig") || "default";
    if (sdkScenarioMap[agentSetKey]) {
      if (sessionStatus !== "DISCONNECTED") return;
      setSessionStatus("CONNECTING");

      try {
        const EPHEMERAL_KEY = await fetchEphemeralKey();
        if (!EPHEMERAL_KEY) return;

        // Ensure the selectedAgentName is first so that it becomes the root
        const reorderedAgents = [...sdkScenarioMap[agentSetKey]];
        const idx = reorderedAgents.findIndex((a) => a.name === selectedAgentName);
        if (idx > 0) {
          const [agent] = reorderedAgents.splice(idx, 1);
          reorderedAgents.unshift(agent);
        }

        const companyName = "Pangea_IA";
        const guardrail = createModerationGuardrail(companyName);

        await connect({
          getEphemeralKey: async () => EPHEMERAL_KEY,
          initialAgents: reorderedAgents,
          audioElement: sdkAudioElement,
          outputGuardrails: [guardrail],
          extraContext: {
            addTranscriptBreadcrumb,
          },
        });
      } catch (err) {
        console.error("Error connecting via SDK:", err);
        setSessionStatus("DISCONNECTED");
      }
      return;
    }
  };

  const disconnectFromRealtime = () => {
    disconnect();
    setSessionStatus("DISCONNECTED");
    setIsPTTUserSpeaking(false);
  };

  const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);

    // Include language instruction with the message
    const languageInstruction = `[LANGUAGE_INSTRUCTION: Please respond in ${selectedLanguage}]`;
    const messageWithLanguage = `${languageInstruction} ${text}`;

    sendClientEvent({
      type: 'conversation.item.create',
      item: {
        id,
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: messageWithLanguage }],
      },
    });
    sendClientEvent({ type: 'response.create' }, '(simulated user text message)');
  };

  const handleImageAnalyzed = (result: any) => {
    console.log('[App] Image analysis result:', result);
    
    if (result.success) {
      // Get the analysis type text in current language
      const analysisTypeKey = `analysis${result.analysisType.charAt(0).toUpperCase()}${result.analysisType.slice(1)}`;
      const analysisTypeText = (t as any)[analysisTypeKey] || result.analysisType;
      
      // Add the uploaded image to the transcript first
      addTranscriptBreadcrumb(`📷 Imagen subida: ${result.fileName || 'imagen'}`, {
        imageData: result.imageData,
        fileName: result.fileName,
        analysisType: result.analysisType,
        isUploadedImage: true
      });
      
      // Then send the analysis request
      const message = `He subido una imagen para análisis (${analysisTypeText}). 

Resultado del análisis:
${result.analysis}

Por favor, responde con tus propios insights adicionales desde tu perspectiva como agente de Pangea_IA.`;

      sendSimulatedUserMessage(message);
    } else {
      alert(result.error || (t as any).errorAnalyzing || 'Error al analizar la imagen');
    }
  };

  const updateSession = (shouldTriggerResponse: boolean = false) => {
    // Reflect Push-to-Talk UI state by (de)activating server VAD on the
    // backend. The Realtime SDK supports live session updates via the
    // `session.update` event.
    const turnDetection = isPTTActive
      ? null
      : {
          type: 'server_vad',
          threshold: 0.9,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true,
        };

    sendEvent({
      type: 'session.update',
      session: {
        turn_detection: turnDetection,
      },
    });

    // Send an initial greeting message to trigger the agent to greet the user in selected language
    if (shouldTriggerResponse) {
      const greeting = selectedLanguage === 'español' ? 'hola' : 
                      selectedLanguage === 'english' ? 'hi' :
                      selectedLanguage === 'français' ? 'salut' :
                      selectedLanguage === 'deutsch' ? 'hallo' :
                      selectedLanguage === 'português' ? 'olá' :
                      selectedLanguage === 'italiano' ? 'ciao' : 'hi';
      sendSimulatedUserMessage(greeting);
    }
    return;
  }

  const handleSendTextMessage = () => {
    if (!userText.trim()) return;
    interrupt();

    try {
      sendUserText(userText.trim());
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }

    setUserText("");
  };

  const handleTalkButtonDown = () => {
    if (sessionStatus !== 'CONNECTED') return;
    interrupt();

    setIsPTTUserSpeaking(true);
    sendClientEvent({ type: 'input_audio_buffer.clear' }, 'clear PTT buffer');

    // No placeholder; we'll rely on server transcript once ready.
  };

  const handleTalkButtonUp = () => {
    if (sessionStatus !== 'CONNECTED' || !isPTTUserSpeaking)
      return;

    setIsPTTUserSpeaking(false);
    sendClientEvent({ type: 'input_audio_buffer.commit' }, 'commit PTT');
    sendClientEvent({ type: 'response.create' }, 'trigger response PTT');
  };

  const onToggleConnection = () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime();
      setSessionStatus("DISCONNECTED");
    } else {
      connectToRealtime();
    }
  };

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAgentConfig = e.target.value;
    const url = new URL(window.location.toString());
    url.searchParams.set("agentConfig", newAgentConfig);
    window.location.replace(url.toString());
  };

  const handleSelectedAgentChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newAgentName = e.target.value;
    // Reconnect session with the newly selected agent as root so that tool
    // execution works correctly.
    disconnectFromRealtime();
    setSelectedAgentName(newAgentName);
    // connectToRealtime will be triggered by effect watching selectedAgentName
  };

  // Because we need a new connection, refresh the page when codec changes
  const handleCodecChange = (newCodec: string) => {
    const url = new URL(window.location.toString());
    url.searchParams.set("codec", newCodec);
    window.location.replace(url.toString());
  };

  useEffect(() => {
    const storedPushToTalkUI = localStorage.getItem("pushToTalkUI");
    if (storedPushToTalkUI) {
      setIsPTTActive(storedPushToTalkUI === "true");
    }
    const storedLogsExpanded = localStorage.getItem("logsExpanded");
    if (storedLogsExpanded) {
      setIsEventsPaneExpanded(storedLogsExpanded === "true");
    }
    const storedAudioPlaybackEnabled = localStorage.getItem(
      "audioPlaybackEnabled"
    );
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pushToTalkUI", isPTTActive.toString());
  }, [isPTTActive]);

  useEffect(() => {
    localStorage.setItem("logsExpanded", isEventsPaneExpanded.toString());
  }, [isEventsPaneExpanded]);

  useEffect(() => {
    localStorage.setItem(
      "audioPlaybackEnabled",
      isAudioPlaybackEnabled.toString()
    );
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      localStorage.setItem("selectedLanguage", selectedLanguage);
    }
  }, [selectedLanguage, isHydrated]);

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.muted = false;
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
      } else {
        // Mute and pause to avoid brief audio blips before pause takes effect.
        audioElementRef.current.muted = true;
        audioElementRef.current.pause();
      }
    }

    // Toggle server-side audio stream mute so bandwidth is saved when the
    // user disables playback. 
    try {
      mute(!isAudioPlaybackEnabled);
    } catch (err) {
      console.warn('Failed to toggle SDK mute', err);
    }
  }, [isAudioPlaybackEnabled]);

  // Ensure mute state is propagated to transport right after we connect or
  // whenever the SDK client reference becomes available.
  useEffect(() => {
    if (sessionStatus === 'CONNECTED') {
      try {
        mute(!isAudioPlaybackEnabled);
      } catch (err) {
        console.warn('mute sync after connect failed', err);
      }
    }
  }, [sessionStatus, isAudioPlaybackEnabled]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED" && audioElementRef.current?.srcObject) {
      // The remote audio stream from the audio element.
      const remoteStream = audioElementRef.current.srcObject as MediaStream;
      startRecording(remoteStream);
    }

    // Clean up on unmount or when sessionStatus is updated.
    return () => {
      stopRecording();
    };
  }, [sessionStatus]);

  const agentSetKey = searchParams.get("agentConfig") || "default";

  // Interface translations
  const translations = {
    español: {
      scenario: "Escenario",
      agent: "Agente", 
      language: "Idioma",
      connect: "Conectar",
      disconnect: "Desconectar",
      connecting: "Conectando...",
      connected: "Conectado",
      disconnected: "Desconectado",
      logs: "Registros",
      sendMessage: "Enviar mensaje",
      typeMessage: "Escribe tu mensaje...",
      pushToTalk: "Presionar para hablar",
      talk: "Hablar",
      audioPlayback: "Reproducción de audio",
      codec: "Códec:",
      decolonialPlatform: "Plataforma de IA Decolonial",
      decolonizingDigital: "Descolonizando lo Digital",
      beyondGravity: "Festival Beyond Gravity",
      exploring: "Explorando enfoques decoloniales hacia la inteligencia artificial",
      globalSouth: "Perspectivas del Sur Global • Epistemologías Indígenas",
      development: "Desarrollo por",
      portfolio: "Portafolio",
      poweredBy: "Impulsado por",
      lastUpdated: "Última actualización",
      uploadImage: "Subir imagen",
      analyzing: "Analizando imagen...",
      analysisGeneral: "Análisis General",
      analysisDecolonial: "Perspectiva Decolonial",
      analysisArtistic: "Análisis Artístico",
      analysisTechnical: "Análisis Técnico",
      analysisCultural: "Perspectiva Cultural",
      analysisCustom: "Prompt Personalizado",
      customPromptPlaceholder: "Escribe tu prompt personalizado para el análisis...",
      dropOrClick: "Arrastra una imagen aquí o haz clic para seleccionar",
      supportedFormats: "Formatos: JPG, PNG, GIF, WebP (máx. 10MB)",
      errorInvalidImage: "Por favor selecciona un archivo de imagen válido",
      errorImageTooLarge: "La imagen es demasiado grande. Máximo 10MB",
      errorAnalyzing: "Error al analizar la imagen. Inténtalo de nuevo.",
      analysisType: "Tipo de análisis",
      selectImage: "Seleccionar imagen",
      downloadImage: "Descargar imagen",
      viewFullImage: "Ver imagen completa",
      downloadingImage: "Descargando imagen..."
    },
    english: {
      scenario: "Scenario",
      agent: "Agent",
      language: "Language", 
      connect: "Connect",
      disconnect: "Disconnect",
      connecting: "Connecting...",
      connected: "Connected",
      disconnected: "Disconnected",
      logs: "Logs",
      sendMessage: "Send message",
      typeMessage: "Type your message...",
      pushToTalk: "Push to talk",
      talk: "Talk",
      audioPlayback: "Audio playback",
      codec: "Codec:",
      decolonialPlatform: "Decolonial AI Research Platform",
      decolonizingDigital: "Decolonizing the Digital",
      beyondGravity: "Beyond Gravity Festival",
      exploring: "Exploring decolonial approaches to artificial intelligence",
      globalSouth: "Global South Perspectives • Indigenous Epistemologies",
      development: "Development by",
      portfolio: "Portfolio", 
      poweredBy: "Powered by",
      lastUpdated: "Last updated",
      uploadImage: "Upload image",
      analyzing: "Analyzing image...",
      analysisGeneral: "General Analysis",
      analysisDecolonial: "Decolonial Perspective",
      analysisArtistic: "Artistic Analysis",
      analysisTechnical: "Technical Analysis",
      analysisCultural: "Cultural Perspective",
      analysisCustom: "Custom Prompt",
      customPromptPlaceholder: "Write your custom prompt for analysis...",
      dropOrClick: "Drag an image here or click to select",
      supportedFormats: "Formats: JPG, PNG, GIF, WebP (max. 10MB)",
      errorInvalidImage: "Please select a valid image file",
      errorImageTooLarge: "Image is too large. Maximum 10MB",
      errorAnalyzing: "Error analyzing image. Please try again.",
      analysisType: "Analysis type",
      selectImage: "Select image",
      downloadImage: "Download image",
      viewFullImage: "View full image",
      downloadingImage: "Downloading image..."
    },
    français: {
      scenario: "Scénario",
      agent: "Agent",
      language: "Langue",
      connect: "Connecter",
      disconnect: "Déconnecter", 
      connecting: "Connexion...",
      connected: "Connecté",
      disconnected: "Déconnecté",
      logs: "Journaux",
      sendMessage: "Envoyer message",
      typeMessage: "Tapez votre message...",
      pushToTalk: "Appuyer pour parler",
      talk: "Parler",
      audioPlayback: "Lecture audio",
      codec: "Codec :",
      decolonialPlatform: "Plateforme de Recherche IA Décoloniale",
      decolonizingDigital: "Décoloniser le Numérique",
      beyondGravity: "Festival Beyond Gravity",
      exploring: "Explorer les approches décoloniales de l'intelligence artificielle",
      globalSouth: "Perspectives du Sud Global • Épistémologies Indigènes",
      development: "Développement par",
      portfolio: "Portfolio",
      poweredBy: "Alimenté par",
      lastUpdated: "Dernière mise à jour"
    },
    deutsch: {
      scenario: "Szenario",
      agent: "Agent",
      language: "Sprache",
      connect: "Verbinden",
      disconnect: "Trennen",
      connecting: "Verbinde...",
      connected: "Verbunden", 
      disconnected: "Getrennt",
      logs: "Protokolle",
      sendMessage: "Nachricht senden",
      typeMessage: "Nachricht eingeben...",
      pushToTalk: "Drücken zum Sprechen",
      talk: "Sprechen",
      audioPlayback: "Audio-Wiedergabe",
      codec: "Codec:",
      decolonialPlatform: "Dekoloniale KI-Forschungsplattform",
      decolonizingDigital: "Das Digitale Dekolonisieren",
      beyondGravity: "Beyond Gravity Festival",
      exploring: "Erforschung dekolonialer Ansätze zur künstlichen Intelligenz",
      globalSouth: "Perspektiven des Globalen Südens • Indigene Epistemologien",
      development: "Entwicklung von",
      portfolio: "Portfolio",
      poweredBy: "Powered by",
      lastUpdated: "Zuletzt aktualisiert"
    },
    português: {
      scenario: "Cenário",
      agent: "Agente",
      language: "Idioma",
      connect: "Conectar",
      disconnect: "Desconectar",
      connecting: "Conectando...",
      connected: "Conectado",
      disconnected: "Desconectado", 
      logs: "Registros",
      sendMessage: "Enviar mensagem",
      typeMessage: "Digite sua mensagem...",
      pushToTalk: "Pressionar para falar",
      talk: "Falar",
      audioPlayback: "Reprodução de áudio",
      codec: "Codec:",
      decolonialPlatform: "Plataforma de Pesquisa IA Decolonial",
      decolonizingDigital: "Descolonizando o Digital",
      beyondGravity: "Festival Beyond Gravity",
      exploring: "Explorando abordagens decoloniais para inteligência artificial",
      globalSouth: "Perspectivas do Sul Global • Epistemologias Indígenas",
      development: "Desenvolvimento por",
      portfolio: "Portfólio",
      poweredBy: "Powered by",
      lastUpdated: "Última atualização"
    },
    italiano: {
      scenario: "Scenario",
      agent: "Agente",
      language: "Lingua",
      connect: "Connetti",
      disconnect: "Disconnetti",
      connecting: "Connessione...",
      connected: "Connesso",
      disconnected: "Disconnesso",
      logs: "Log",
      sendMessage: "Invia messaggio", 
      typeMessage: "Scrivi il tuo messaggio...",
      pushToTalk: "Premi per parlare",
      talk: "Parla",
      audioPlayback: "Riproduzione audio",
      codec: "Codec:",
      decolonialPlatform: "Piattaforma di Ricerca IA Decoloniale",
      decolonizingDigital: "Decolonizzare il Digitale",
      beyondGravity: "Festival Beyond Gravity",
      exploring: "Esplorando approcci decoloniali all'intelligenza artificiale",
      globalSouth: "Prospettive del Sud Globale • Epistemologie Indigene",
      development: "Sviluppo di",
      portfolio: "Portfolio",
      poweredBy: "Powered by",
      lastUpdated: "Ultimo aggiornamento"
    },
    "中文": {
      scenario: "场景",
      agent: "代理",
      language: "语言",
      connect: "连接",
      disconnect: "断开",
      connecting: "连接中...",
      connected: "已连接",
      disconnected: "已断开",
      logs: "日志",
      sendMessage: "发送消息",
      typeMessage: "输入您的消息...",
      pushToTalk: "按住说话",
      talk: "说话",
      audioPlayback: "音频播放",
      codec: "编解码器:",
      decolonialPlatform: "去殖民人工智能研究平台",
      decolonizingDigital: "去殖民化数字",
      beyondGravity: "Beyond Gravity 节",
      exploring: "探索人工智能的去殖民方法",
      globalSouth: "全球南方视角 • 本土认识论",
      development: "开发者",
      portfolio: "作品集",
      poweredBy: "技术支持",
      lastUpdated: "最后更新"
    },
    "日本語": {
      scenario: "シナリオ",
      agent: "エージェント", 
      language: "言語",
      connect: "接続",
      disconnect: "切断",
      connecting: "接続中...",
      connected: "接続済み",
      disconnected: "切断済み",
      logs: "ログ",
      sendMessage: "メッセージを送信",
      typeMessage: "メッセージを入力...",
      pushToTalk: "押して話す",
      talk: "話す",
      audioPlayback: "音声再生",
      codec: "コーデック:",
      decolonialPlatform: "脱植民地AI研究プラットフォーム",
      decolonizingDigital: "デジタルの脱植民地化",
      beyondGravity: "Beyond Gravityフェスティバル",
      exploring: "人工知能への脱植民地的アプローチの探求",
      globalSouth: "グローバルサウスの視点 • 先住民の認識論",
      development: "開発者",
      portfolio: "ポートフォリオ",
      poweredBy: "技術提供",
      lastUpdated: "最終更新"
    },
    "العربية": {
      scenario: "السيناريو",
      agent: "الوكيل",
      language: "اللغة", 
      connect: "اتصال",
      disconnect: "قطع الاتصال",
      connecting: "جاري الاتصال...",
      connected: "متصل",
      disconnected: "غير متصل",
      logs: "السجلات",
      sendMessage: "إرسال رسالة",
      typeMessage: "اكتب رسالتك...",
      pushToTalk: "اضغط للتحدث",
      talk: "تحدث",
      audioPlayback: "تشغيل الصوت",
      codec: "برنامج الترميز:",
      decolonialPlatform: "منصة بحث الذكاء الاصطناعي اللاستعماري",
      decolonizingDigital: "إنهاء استعمار الرقمي",
      beyondGravity: "مهرجان Beyond Gravity",
      exploring: "استكشاف المناهج اللاستعمارية للذكاء الاصطناعي",
      globalSouth: "وجهات نظر الجنوب العالمي • المعرفيات الأصلية",
      development: "تطوير بواسطة",
      portfolio: "الحافظة",
      poweredBy: "مدعوم من",
      lastUpdated: "آخر تحديث"
    },
    "हिन्दी": {
      scenario: "परिदृश्य",
      agent: "एजेंट",
      language: "भाषा",
      connect: "कनेक्ट करें",
      disconnect: "डिस्कनेक्ट करें",
      connecting: "कनेक्ट हो रहा है...",
      connected: "कनेक्टेड",
      disconnected: "डिस्कनेक्टेड", 
      logs: "लॉग्स",
      sendMessage: "संदेश भेजें",
      typeMessage: "अपना संदेश टाइप करें...",
      pushToTalk: "बोलने के लिए दबाएं",
      talk: "बात करें",
      audioPlayback: "ऑडियो प्लेबैक",
      codec: "कोडेक:",
      decolonialPlatform: "उपनिवेशवाद-विरोधी AI अनुसंधान प्लेटफॉर्म",
      decolonizingDigital: "डिजिटल का उपनिवेशीकरण समाप्त करना",
      beyondGravity: "Beyond Gravity महोत्सव",
      exploring: "कृत्रिम बुद्धिमत्ता के लिए उपनिवेशवाद-विरोधी दृष्टिकोण की खोज",
      globalSouth: "ग्लोबल साउथ के दृष्टिकोण • स्वदेशी ज्ञान प्रणालियां",
      development: "विकास",
      portfolio: "पोर्टफोलियो",
      poweredBy: "द्वारा संचालित",
      lastUpdated: "अंतिम अपडेट"
    },
    "русский": {
      scenario: "Сценарий",
      agent: "Агент",
      language: "Язык",
      connect: "Подключить",
      disconnect: "Отключить", 
      connecting: "Подключение...",
      connected: "Подключено",
      disconnected: "Отключено",
      logs: "Логи",
      sendMessage: "Отправить сообщение",
      typeMessage: "Введите ваше сообщение...",
      pushToTalk: "Нажать для разговора",
      talk: "Говорить",
      audioPlayback: "Воспроизведение аудио",
      codec: "Кодек:",
      decolonialPlatform: "Деколониальная ИИ Исследовательская Платформа",
      decolonizingDigital: "Деколонизация Цифрового",
      beyondGravity: "Фестиваль Beyond Gravity",
      exploring: "Исследование деколониальных подходов к искусственному интеллекту",
      globalSouth: "Перспективы Глобального Юга • Коренные Эпистемологии",
      development: "Разработка",
      portfolio: "Портфолио",
      poweredBy: "При поддержке",
      lastUpdated: "Последнее обновление"
    }
  };

  const t = translations[selectedLanguage as keyof typeof translations] || translations.español;

  // Show loading until hydration is complete to prevent hydration mismatch
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="text-base flex flex-col h-screen bg-gray-100 text-gray-800 relative">
      <div className="p-5 text-lg font-semibold flex justify-between items-center">
        <div
          className="flex items-center cursor-pointer"
          onClick={() => window.location.reload()}
        >
          <div>
            Pangea_IA <span className="text-gray-500">Decolonial AI</span>
          </div>
        </div>
        <div className="flex items-center">
          <label className="flex items-center text-sm gap-1 mr-2 font-medium">
            {t.scenario}
          </label>
          <div className="relative inline-block">
            <select
              value={agentSetKey}
              onChange={handleAgentChange}
              className="appearance-none border border-gray-300 rounded-lg text-sm px-2 py-1 pr-8 cursor-pointer font-normal focus:outline-none"
            >
              {Object.keys(allAgentSets).map((agentKey) => (
                <option key={agentKey} value={agentKey}>
                  {agentKey}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-600">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          {agentSetKey && (
            <div className="flex items-center ml-6">
              <label className="flex items-center text-sm gap-1 mr-2 font-medium">
                {t.agent}
              </label>
              <div className="relative inline-block">
                <select
                  value={selectedAgentName}
                  onChange={handleSelectedAgentChange}
                  className="appearance-none border border-gray-300 rounded-lg text-sm px-2 py-1 pr-8 cursor-pointer font-normal focus:outline-none"
                >
                  {selectedAgentConfigSet?.map((agent) => (
                    <option key={agent.name} value={agent.name}>
                      {agent.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-600">
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center ml-6">
            <label className="flex items-center text-sm gap-1 mr-2 font-medium">
              {t.language}
            </label>
            <div className="relative inline-block">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="appearance-none border border-gray-300 rounded-lg text-sm px-2 py-1 pr-8 cursor-pointer font-normal focus:outline-none"
              >
                <option value="español">🇪🇸 Español</option>
                <option value="english">🇺🇸 English</option>
                <option value="français">🇫🇷 Français</option>
                <option value="deutsch">🇩🇪 Deutsch</option>
                <option value="português">🇧🇷 Português</option>
                <option value="italiano">🇮🇹 Italiano</option>
                <option value="中文">🇨🇳 中文</option>
                <option value="日本語">🇯🇵 日本語</option>
                <option value="العربية">🇸🇦 العربية</option>
                <option value="हिन्दी">🇮🇳 हिन्दी</option>
                <option value="русский">🇷🇺 Русский</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-600">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-2 px-2 overflow-hidden relative">
        <Transcript
          userText={userText}
          setUserText={setUserText}
          onSendMessage={handleSendTextMessage}
          downloadRecording={downloadRecording}
          canSend={
            sessionStatus === "CONNECTED"
          }
          onImageAnalyzed={handleImageAnalyzed}
          translations={t}
        />

        <Events isExpanded={isEventsPaneExpanded} translations={t} />
      </div>

      <BottomToolbar
        sessionStatus={sessionStatus}
        onToggleConnection={onToggleConnection}
        isPTTActive={isPTTActive}
        setIsPTTActive={setIsPTTActive}
        isPTTUserSpeaking={isPTTUserSpeaking}
        handleTalkButtonDown={handleTalkButtonDown}
        handleTalkButtonUp={handleTalkButtonUp}
        isEventsPaneExpanded={isEventsPaneExpanded}
        setIsEventsPaneExpanded={setIsEventsPaneExpanded}
        isAudioPlaybackEnabled={isAudioPlaybackEnabled}
        setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
        codec={urlCodec}
        onCodecChange={handleCodecChange}
        translations={t}
      />

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-xs text-gray-600 text-center">
        <div className="flex flex-col space-y-1">
          <div className="font-semibold text-gray-700">
            © 2025 Pangea.IA | {t.decolonialPlatform} | Marlon Barrios Solano and Maria Luisa Angulo
          </div>
          <div className="text-purple-700 font-medium">
            &ldquo;{t.decolonizingDigital}&rdquo; • {t.beyondGravity} | Theater Im Depot, Dortmund
          </div>
          <div className="flex justify-center items-center space-x-4 flex-wrap">
            <span>{t.development} <a href="https://marlonbarrios.github.io/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Marlon Barrios Solano</a></span>
            <span>•</span>
            <span>{t.poweredBy} OpenAI GPT-4o</span>
            <span>•</span>
            <span>{t.lastUpdated}: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
