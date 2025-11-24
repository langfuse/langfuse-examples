import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { differenceInMilliseconds, intervalToDuration, formatDuration } from "date-fns";

const dateDiffSchema = z.object({
  start: z.string().describe("The start date and time in ISO 8601 format (e.g. 2025-03-03T14:00:00)"),
  end: z.string().describe("The end date and time in ISO 8601 format (e.g. 2025-03-07T09:30:00)"),
});

export const dateDiffTool = tool(
  async ({ start, end }) => {
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return "Error: Invalid date format provided. Please use ISO 8601 format.";
      }

      const diffInMs = differenceInMilliseconds(endDate, startDate);
      const duration = intervalToDuration({ start: startDate, end: endDate });
      
      const totalHours = diffInMs / (1000 * 60 * 60);
      const totalDays = diffInMs / (1000 * 60 * 60 * 24);
      
      // Create a detailed result object
      const result = {
        diffInMs,
        totalHours,
        totalDays,
        humanReadable: formatDuration(duration),
        duration
      };

      return JSON.stringify(result);
    } catch (error) {
      return `Error calculating time difference: ${error}`;
    }
  },
  {
    name: "calculate_time_difference",
    description: "Calculates the exact time difference between two specific dates/times. Returns duration in days, hours, etc.",
    schema: dateDiffSchema,
  }
);

