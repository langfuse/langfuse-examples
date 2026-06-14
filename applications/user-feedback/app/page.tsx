"use client";

import { Branch, BranchMessages } from "@/components/ai-elements/branch";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Response } from "@/components/ai-elements/response";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { FeedbackButtons } from "@/components/ai-elements/feedback-buttons";
import { useChat } from "@ai-sdk/react";
import { GlobeIcon, MicIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { LangfuseWeb } from "langfuse";
import { DefaultChatTransport } from "ai";

const langfuse = new LangfuseWeb({
  baseUrl: process.env.NEXT_PUBLIC_LANGFUSE_HOST,
  publicKey: process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY,
});

const models = [
  { id: "gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
];

const suggestions = [
  "What's Langfuse?",
  "How to get user feedback in my traces?",
];

const Example = () => {
  const [selectedModel, setSelectedModel] = useState<string>(models[0].id);
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const [useMicrophone, setUseMicrophone] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>("");
  const conversationEndRef = useRef<HTMLDivElement>(null);
  // Track user feedback for each message ID (1 = thumbs up, 0 = thumbs down, null = no feedback)
  const [userFeedback, setUserFeedback] = useState<
    Map<string, { value: number; comment?: string }>
  >(new Map());

  const chatId = useMemo(() => `chat_${crypto.randomUUID()}`, []);
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      body: { chatId },
    }),
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    if (message.files?.length) {
      toast.success("Files attached", {
        description: `${message.files.length} file(s) attached to message`,
      });
    }

    sendMessage(
      { text: message.text || "Sent with attachments" },
      {
        body: {
          model: selectedModel,
        },
      }
    );
    setInputText("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(
      { text: suggestion },
      {
        body: {
          model: selectedModel,
        },
      }
    );
  };

  const handleFeedback = (
    messageId: string,
    value: number,
    comment?: string
  ) => {
    // Update the local state
    setUserFeedback((prev) => new Map([...prev, [messageId, { value, comment }]]));

    // Send feedback to Langfuse
    langfuse.score({
      traceId: messageId,
      id: `user-feedback-${messageId}`,
      name: "user-feedback",
      value: value,
      comment: comment,
    });
  };

  return (
    <div className="relative flex h-full flex-col divide-y overflow-hidden">
      <Conversation className="flex-1 min-h-0 overflow-hidden">
        <ConversationContent className="flex-1 overflow-auto">
          {messages.map((message) => (
            <Branch defaultBranch={0} key={message.id}>
              <BranchMessages>
                <Message
                  from={message.role === "user" ? "user" : "assistant"}
                  key={message.id}
                >
                  <div>
                    <MessageContent>
                      {message.parts.map((part, index) =>
                        part.type === "text" ? (
                          <Response key={index}>{part.text}</Response>
                        ) : null
                      )}
                    </MessageContent>
                    {message.role === "assistant" && (
                      <FeedbackButtons
                        onFeedback={(feedback) =>
                          handleFeedback(
                            message.id,
                            feedback.type === "upvote" ? 1 : 0,
                            feedback.comment
                          )
                        }
                        initialFeedback={userFeedback.get(message.id)}
                        className="mt-2"
                      />
                    )}
                  </div>
                  <MessageAvatar
                    name={message.role === "user" ? "User" : "Assistant"}
                    src={
                      message.role === "user"
                        ? "https://github.com/haydenbleasel.png"
                        : "https://github.com/openai.png"
                    }
                  />
                </Message>
              </BranchMessages>
            </Branch>
          ))}
          <div ref={conversationEndRef} />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="grid shrink-0 gap-4 pt-4">
        <Suggestions className="px-4">
          {suggestions.map((suggestion) => (
            <Suggestion
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              suggestion={suggestion}
            />
          ))}
        </Suggestions>
        <div className="w-full px-4 pb-4">
          <PromptInput globalDrop multiple onSubmit={handleSubmit}>
            <PromptInputHeader>
              <PromptInputAttachments>
                {(attachment) => <PromptInputAttachment data={attachment} />}
              </PromptInputAttachments>
            </PromptInputHeader>
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(event) => setInputText(event.target.value)}
                value={inputText}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                <PromptInputButton
                  onClick={() => setUseMicrophone(!useMicrophone)}
                  variant={useMicrophone ? "default" : "ghost"}
                >
                  <MicIcon size={16} />
                  <span className="sr-only">Microphone</span>
                </PromptInputButton>
                <PromptInputButton
                  onClick={() => setUseWebSearch(!useWebSearch)}
                  variant={useWebSearch ? "default" : "ghost"}
                >
                  <GlobeIcon size={16} />
                  <span>Search</span>
                </PromptInputButton>
                <PromptInputModelSelect
                  onValueChange={setSelectedModel}
                  value={selectedModel}
                >
                  <PromptInputModelSelectTrigger>
                    <PromptInputModelSelectValue />
                  </PromptInputModelSelectTrigger>
                  <PromptInputModelSelectContent>
                    {models.map((model) => (
                      <PromptInputModelSelectItem
                        key={model.id}
                        value={model.id}
                      >
                        {model.name}
                      </PromptInputModelSelectItem>
                    ))}
                  </PromptInputModelSelectContent>
                </PromptInputModelSelect>
              </PromptInputTools>
              <PromptInputSubmit
                disabled={
                  !(inputText.trim() || status) || status === "streaming"
                }
                status={status}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};

export default Example;
