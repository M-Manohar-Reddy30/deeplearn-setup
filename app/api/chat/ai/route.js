export const maxDuration = 60;
import connectDB from "@/config/db";
import Chat from "@/models/Chat";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";


// Initialize OpenAI client with DeepSeek API key and base URL
const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: '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',
});

export async function POST(req){
    try {
        const {userId} = getAuth(req)

        // Extract chatId and prompt from the request body
        const { chatId, prompt } = await req.json();

        if(!userId){
            return NextResponse.json({
                success: false,
                message: "User not authenticated",
              });
        }

        // Find the chat document in the database based on userId and chatId
        await connectDB()
        const data = await Chat.findOne({userId, _id: chatId})

        // Create a user message object
        const userPrompt = {
            role: "user",
            content: prompt,
            timestamp: Date.now()
        };

        data.messages.push(userPrompt);

        // Call the DeepSeek API to get a chat completion

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "deepseek-chat",
            store: true,
        });

        const message = completion.choices[0].message;
        message.timestamp = Date.now()
        data.messages.push(message);
        data.save();

        return NextResponse.json({success: true, data: message})
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message });
    }
}