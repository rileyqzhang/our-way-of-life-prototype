import { defineEnableDraftMode } from "next-sanity/draft-mode";
import { client } from "@/lib/sanity/client";

const token = process.env.SANITY_API_READ_TOKEN;

export const GET =
  client && token
    ? defineEnableDraftMode({ client: client.withConfig({ token }) }).GET
    : async function GET() {
        return new Response("Sanity preview is not configured.", { status: 501 });
      };
