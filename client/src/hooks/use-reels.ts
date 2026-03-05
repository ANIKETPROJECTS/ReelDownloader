import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

export function useDownloadReel() {
  return useMutation({
    mutationFn: async (url: string) => {
      console.log("useDownloadReel: Starting mutation for URL:", url);
      // 1. Client-side validation using shared schema
      const validated = api.reels.download.input.parse({ url });

      // 2. API Request
      console.log("useDownloadReel: Sending POST to", api.reels.download.path);
      const res = await fetch(window.location.origin + api.reels.download.path, {
        method: api.reels.download.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      console.log("useDownloadReel: Response status:", res.status);

      // 3. Handle non-200 responses
      if (!res.ok) {
        let errorData;
        try {
          const text = await res.text();
          console.log("useDownloadReel: Raw error response text:", text);
          errorData = JSON.parse(text);
          console.error("useDownloadReel: Parsed error data:", errorData);
        } catch (e) {
          console.error("useDownloadReel: Failed to parse error response as JSON. Error:", e);
        }

        if (errorData?.message) {
          throw new Error(errorData.message);
        }
        
        throw new Error(`Failed to process download request (Status: ${res.status}). ${errorData?.error || ''}`);
      }

      // 4. Parse successful response
      const data = await res.json();
      console.log("useDownloadReel: Success response data:", data);
      return api.reels.download.responses[200].parse(data);
    },
  });
}
