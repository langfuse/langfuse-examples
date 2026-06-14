"use client";

import {
  PipecatClientAudio,
  usePipecatClient,
  useRTVIClientEvent,
} from "@pipecat-ai/client-react";
import { RTVIEvent } from "@pipecat-ai/client-js";
import clsx from "clsx";
import { useEffect, useState, useCallback } from "react";

export default function Home() {
  const pipecatClient = usePipecatClient();
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Listen for bot speaking events to detect speaking state
  useRTVIClientEvent(
    RTVIEvent.UserStartedSpeaking,
    useCallback(() => {
      setIsSpeaking(true);
    }, [])
  );

  useRTVIClientEvent(
    RTVIEvent.UserStoppedSpeaking,
    useCallback(() => {
      setIsSpeaking(false);
    }, [])
  );

  useEffect(() => {
    if (!pipecatClient) return;

    const startConnection = async () => {
      await pipecatClient.startBotAndConnect({
        endpoint: `${
          process.env.NEXT_PUBLIC_PIPECAT_API_URL || "/api"
        }/connect`,
      });
    };

    startConnection();

    return () => {
      if (pipecatClient.connected) {
        pipecatClient.disconnect();
      }
    };
  }, [pipecatClient]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-neutral-400 ml-20 text-balance space-y-4">
        <p>
          An open-source voice assistant expert on{" "}
          <A href="https://langfuse.com">Langfuse</A> powered by:
        </p>
        <ul className="list-disc list-inside space-y-1 text-left inline-block">
          <li>
            <A href="https://pipecat.ai">Pipecat</A>, conversational AI framework
          </li>
          <li>
            <A href="https://daily.co">Daily</A>, real-time voice
            communication
          </li>
          <li>
            <A href="https://www.elevenlabs.io/">ElevenLabs</A>,
            text-to-speech service
          </li>
          <li>
            <A href="https://nextjs.org">Next.js 15</A>
          </li>
        </ul>

        <p>Start talking to chat, you can also cut me off while I'm talking or just say "stop".</p>

        <p>
          {" "}
          <A href="https://github.com/aabedraba/langchat" target="_blank">
            See the code and deploy it yourself!
          </A>
        </p>
      </div>

      {/* Animated bubble that responds to speech detection */}
      <div
        className={clsx(
          "absolute size-36 blur-3xl rounded-full bg-gradient-to-b from-red-200 to-red-400 dark:from-red-600 dark:to-red-800 -z-50 transition-all duration-300 ease-in-out left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2",
          {
            "opacity-40": !isSpeaking,
            "opacity-100 scale-200 animate-pulse": isSpeaking,
          }
        )}
      />
      {isSpeaking && (
        <div className="absolute size-24 blur-2xl rounded-full bg-gradient-to-b from-orange-300 to-red-500 dark:from-orange-400 dark:to-red-600 -z-40 opacity-60 animate-ping left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      )}

      <PipecatClientAudio />
    </div>
  );
}

function A(props: React.ComponentPropsWithoutRef<"a">) {
  return (
    <a
      {...props}
      className="font-extrabold hover:underline"
    />
  );
}
