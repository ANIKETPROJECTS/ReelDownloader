import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

export function useDownloadReel() {
  return useMutation({
    mutationFn: async (url: string) => {
      console.log("useDownloadReel: Starting mutation for URL:", url);
      const startTime = Date.now();
      // 1. Client-side validation using shared schema
      const validated = api.reels.download.input.parse({ url });

      // 2. API Request
      const endpoint = window.location.origin + api.reels.download.path;
      console.log(`useDownloadReel: Sending ${api.reels.download.method} to ${endpoint}`);
      
      try {
        const res = await fetch(endpoint, {
          method: api.reels.download.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validated),
        });

        const duration = Date.now() - startTime;
        console.log(`useDownloadReel: Response received in ${duration}ms. Status: ${res.status} ${res.statusText}`);

        // 3. Handle non-200 responses
        if (!res.ok) {
          let errorData;
          try {
            const text = await res.text();
            console.log("useDownloadReel: Error response body:", text);
            errorData = JSON.parse(text);
          } catch (e) {
            console.error("useDownloadReel: Could not parse error as JSON");
          }

          throw new Error(errorData?.message || `Server error: ${res.status}`);
        }

        // 4. Parse successful response
        const data = await res.json();
        console.log("useDownloadReel: Success response data:", data);
        return api.reels.download.responses[200].parse(data);
      } catch (err: any) {
        const duration = Date.now() - startTime;
        console.error(`useDownloadReel: Request failed after ${duration}ms:`, err);
        throw err;
      }
    },
  });
}
