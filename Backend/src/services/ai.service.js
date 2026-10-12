const {GoogleGenAI} = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY,
    
});


// const { GoogleGenAI } = require("@google/genai");

// const genAI = new GoogleGenAI({
//   apiKey: process.env.GEMINI_API_KEY,
// });

async function invokeGeminiAi(){

    const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
    contents: "hello gemini ! explain what is interview ?"
    })

    console.log(response.text)

}

module.exports = invokeGeminiAi
