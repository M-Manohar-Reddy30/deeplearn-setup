export const maxDuration = 60;
import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Hugging Face API endpoint and model
const HF_API_URL = "https://api-inference.huggingface.co/models/facebook/opt-125m";
const HF_API_KEY = process.env.HF_API_KEY; // 👈 put your key in .env.local

export async function POST(req) {
  try {
    const { userId } = getAuth(req);

    // Extract chatId and prompt from the request body
    const { chatId, prompt } = await req.json();

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Find the chat document in the database based on userId and chatId
    await connectDB();
    const data = await Chat.findOne({ userId, _id: chatId });

    // Create a user message object
    const userPrompt = {
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    };

    data.messages.push(userPrompt);

    // Call Hugging Face API
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
      }),
    });

    const result = await response.json();

    // Hugging Face returns an array with { generated_text }
    const aiReply =
      result[0]?.generated_text || "⚠️ No response from Hugging Face model.";

    const message = {
      role: "assistant",
      content: aiReply,
      timestamp: Date.now(),
    };

    data.messages.push(message);
    await data.save();

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
