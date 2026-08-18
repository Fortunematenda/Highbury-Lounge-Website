import { handlePaynowResultPayload } from "@/lib/paynow-payments";
import { parsePaynowResultBody, PaynowError } from "@/lib/paynow";

export async function POST(request: Request) {
  try {
    const rawText = await request.text();
    const fields = parsePaynowResultBody(rawText);
    await handlePaynowResultPayload(fields);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Paynow result error:", error);
    if (error instanceof PaynowError) {
      return new Response(error.message, { status: error.status });
    }
    return new Response("Error", { status: 500 });
  }
}
