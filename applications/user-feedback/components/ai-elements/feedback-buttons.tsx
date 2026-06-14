"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type FeedbackButtonsProps = {
  onFeedback?: (feedback: {
    type: "upvote" | "downvote";
    comment?: string;
  }) => void;
  className?: string;
  initialFeedback?: {
    value: number;
    comment?: string;
  };
};

export const FeedbackButtons = ({
  onFeedback,
  className,
  initialFeedback,
}: FeedbackButtonsProps) => {
  const [selectedFeedback, setSelectedFeedback] = useState<
    "upvote" | "downvote" | null
  >(initialFeedback ? (initialFeedback.value === 1 ? "upvote" : "downvote") : null);
  const [comment, setComment] = useState(initialFeedback?.comment || "");
  const [upvoteOpen, setUpvoteOpen] = useState(false);
  const [downvoteOpen, setDownvoteOpen] = useState(false);

  const handleFeedback = (type: "upvote" | "downvote") => {
    setSelectedFeedback(type);
    // Restore the comment from initialFeedback when reopening
    if (initialFeedback && !comment) {
      setComment(initialFeedback.comment || "");
    }
    if (type === "upvote") {
      setUpvoteOpen(true);
    } else {
      setDownvoteOpen(true);
    }
  };

  const handleSubmitFeedback = (type: "upvote" | "downvote") => {
    onFeedback?.({
      type,
      comment: comment.trim() || undefined,
    });
    setComment("");
    setUpvoteOpen(false);
    setDownvoteOpen(false);
  };

  const handleSkip = (type: "upvote" | "downvote") => {
    onFeedback?.({
      type,
      comment: undefined,
    });
    setComment("");
    setUpvoteOpen(false);
    setDownvoteOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover open={upvoteOpen} onOpenChange={setUpvoteOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "size-9 p-1.5 text-muted-foreground hover:text-foreground",
              selectedFeedback === "upvote" && "text-green-600"
            )}
            onClick={() => handleFeedback("upvote")}
          >
            <ThumbsUp size={16} />
            <span className="sr-only">Upvote</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Additional Feedback</h4>
              <p className="text-sm text-muted-foreground">
                Tell us more about what you liked (optional)
              </p>
            </div>
            <Textarea
              placeholder="What did you like about this response?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="h-20"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSkip("upvote")}
              >
                Skip
              </Button>
              <Button size="sm" onClick={() => handleSubmitFeedback("upvote")}>
                Submit
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={downvoteOpen} onOpenChange={setDownvoteOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "size-9 p-1.5 text-muted-foreground hover:text-foreground",
              selectedFeedback === "downvote" && "text-red-600"
            )}
            onClick={() => handleFeedback("downvote")}
          >
            <ThumbsDown size={16} />
            <span className="sr-only">Downvote</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Additional Feedback</h4>
              <p className="text-sm text-muted-foreground">
                Tell us what went wrong (optional)
              </p>
            </div>
            <Textarea
              placeholder="What could be improved?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="h-20"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSkip("downvote")}
              >
                Skip
              </Button>
              <Button
                size="sm"
                onClick={() => handleSubmitFeedback("downvote")}
              >
                Submit
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
