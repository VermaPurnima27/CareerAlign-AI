const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const puppeteer = require("puppeteer"); 

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY,

});


const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("Technical question can be asked in the interview"),
        intention: z.string().describe("The Intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to be covered in the answer, what approach to be taken to etc.")

    })).describe("Technical questions that can be asked in the interview along with the intention of the interviewer and how to answer them"),

    behavioralQuestions: z.array(z.object({
        question: z.string().describe("Behavioral question can be asked in the interview"),
        intention: z.string().describe("The Intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to be covered in the answer, what approach to be taken to answer this question, what mistakes to avoid while answering this question")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),

    skillGaps: z.array(z.object({
        skill: z.string().describe("The Skill which the candidate is lacking"),
        severity: z.enum(["low", "medium", "high"]).describe("Severity of the skill gap,i.e. how important is this skill for the job")
    })).describe("List of skills gaps in the candidates's profile along with thier servrity"),

    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),

})



const interviewReportJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    matchScore: { type: "number" },

    technicalQuestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          intention: { type: "string" },
          answer: { type: "string" }
        },
        required: ["question", "intention", "answer"]
      }
    },

    behavioralQuestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          intention: { type: "string" },
          answer: { type: "string" }
        },
        required: ["question", "intention", "answer"]
      }
    },

    skillGaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          skill: { type: "string" },
          severity: {
            type: "string",
            enum: ["low", "medium", "high"]
          }
        },
        required: ["skill", "severity"]
      }
    },

    preparationPlan: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "integer" },
          focus: { type: "string" },
          tasks: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["day", "focus", "tasks"]
      }
    }
  },
  required: [
    "title",
    "matchScore",
    "technicalQuestions",
    "behavioralQuestions",
    "skillGaps",
    "preparationPlan"
  ]
};



async function generateInterviewReport({
    resume,
    selfDescription,
    jobDescription
}) {
    if (!resume || !jobDescription) {
        throw new Error("Resume and Job Description are required.");
    }

    const prompt = `
You are an expert technical interviewer and career advisor.

Analyze the candidate's resume and job description carefully.

Generate a COMPLETE interview preparation report.

Requirements:
1. Generate at least 8 relevant technical interview questions.
2. Generate at least 6 behavioral interview questions.
3. Every question must include question, intention and answer.
4. Identify relevant skill gaps by comparing the resume with the job description.
5. Each skill gap severity must be low, medium or high.
6. Generate a practical 7-day preparation plan.
7. Each day must contain day, focus and tasks.
8. Generate a matchScore between 0 and 100.
9. Set title to the job title from the job description.
10. Do not return empty arrays for technicalQuestions,
    behavioralQuestions or preparationPlan.
11. Do not invent skills or experience not supported by the resume.
12. Return valid JSON matching the provided schema.

RESUME:
${resume}

SELF-DESCRIPTION:
${selfDescription || "Not provided"}

JOB DESCRIPTION:
${jobDescription}
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
    responseMimeType: "application/json",
    responseJsonSchema: interviewReportJsonSchema
}
        });

        if (!response.text) {
            throw new Error("Gemini returned an empty response.");
        }

        const report = interviewReportSchema.parse(
            JSON.parse(response.text)
        );

        if (
            report.technicalQuestions.length === 0 ||
            report.behavioralQuestions.length === 0 ||
            report.preparationPlan.length === 0
        ) {
            throw new Error(
                "AI generated an incomplete interview report."
            );
        }

        console.log("Interview report generated successfully.");
        console.log(
            "Technical questions:",
            report.technicalQuestions.length
        );
        console.log(
            "Behavioral questions:",
            report.behavioralQuestions.length
        );

        return report;

    } catch (error) {
        console.error(
            "Interview report generation failed:",
            error.message
        );

        throw error;
    }
}

    
async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({ format: 'A4',
        margin: {
            top: '20mm',
            bottom: '20mm',
            left: '15mm',
            right: '15mm',
        },
    });
     
    await browser.close();
    return pdfBuffer;
}

    async function generateResumePdf({resume, selfDescription, jobDescription}) {
         const resumePdfSchema = z.object({
           html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer"),
            
         })
         const prompt = `Generate a resume for a candidate with the following details:
         Resume: ${resume}
         Self describe: ${selfDescription}
         Job describe: ${jobDescription}
         
                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                    `


         const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseJsonSchema:zodToJsonSchema(resumePdfSchema),
            }
        })
       const jsonnContent = JSON.parse(response.text)

       const pdfBuffer = await generatePdfFromHtml(jsonnContent.html)
       return pdfBuffer
    }
    module.exports = {  generateInterviewReport, generateResumePdf};




    

      





    

















    
// const { GoogleGenAI, Type } = require("@google/genai");
// const { z } = require("zod");

// const ai = new GoogleGenAI({
//     apiKey: process.env.GOOGLE_GENAI_API_KEY,
// });

// // Validate Gemini response
// const interviewReportSchema = z.object({
//     matchScore: z.number().min(0).max(100),

//     technicalQuestions: z.array(
//         z.object({
//             question: z.string(),
//             intention: z.string(),
//             answer: z.string(),
//         })
//     ),

//     behavioralQuestions: z.array(
//         z.object({
//             question: z.string(),
//             intention: z.string(),
//             answer: z.string(),
//         })
//     ),

//     skillGaps: z.array(
//         z.object({
//             skill: z.string(),
//             severity: z.enum(["low", "medium", "high"]),
//         })
//     ),

//     preparationPlan: z.array(
//         z.object({
//             day: z.number(),
//             focus: z.string(),
//             tasks: z.array(z.string()),
//         })
//     ),

//     title: z.string(),
// });

// // Gemini structured JSON schema
// const reportResponseSchema = {
//     type: Type.OBJECT,
//     properties: {
//         matchScore: {
//             type: Type.NUMBER,
//         },
//         title: {
//             type: Type.STRING,
//         },
//         technicalQuestions: {
//             type: Type.ARRAY,
//             items: {
//                 type: Type.OBJECT,
//                 properties: {
//                     question: { type: Type.STRING },
//                     intention: { type: Type.STRING },
//                     answer: { type: Type.STRING },
//                 },
//                 required: ["question", "intention", "answer"],
//             },
//         },
//         behavioralQuestions: {
//             type: Type.ARRAY,
//             items: {
//                 type: Type.OBJECT,
//                 properties: {
//                     question: { type: Type.STRING },
//                     intention: { type: Type.STRING },
//                     answer: { type: Type.STRING },
//                 },
//                 required: ["question", "intention", "answer"],
//             },
//         },
//         skillGaps: {
//             type: Type.ARRAY,
//             items: {
//                 type: Type.OBJECT,
//                 properties: {
//                     skill: { type: Type.STRING },
//                     severity: {
//                         type: Type.STRING,
//                         enum: ["low", "medium", "high"],
//                     },
//                 },
//                 required: ["skill", "severity"],
//             },
//         },
//         preparationPlan: {
//             type: Type.ARRAY,
//             items: {
//                 type: Type.OBJECT,
//                 properties: {
//                     day: { type: Type.INTEGER },
//                     focus: { type: Type.STRING },
//                     tasks: {
//                         type: Type.ARRAY,
//                         items: { type: Type.STRING },
//                     },
//                 },
//                 required: ["day", "focus", "tasks"],
//             },
//         },
//     },
//     required: [
//         "matchScore",
//         "title",
//         "technicalQuestions",
//         "behavioralQuestions",
//         "skillGaps",
//         "preparationPlan",
//     ],
// };

// async function generateInterviewReport(
//     resume,
//     selfDescription,
//     jobDescription
// ) {
//     if (!resume || !jobDescription) {
//         throw new Error(
//             "Resume and Job Description are required."
//         );
//     }

//     const prompt = `
// You are an expert technical interviewer and career advisor.

// Analyze the candidate's resume against the job description.

// Return a complete interview report following the exact JSON schema.

// Requirements:
// 1. Generate relevant technical interview questions.
// 2. Generate relevant behavioral interview questions.
// 3. Every question must include question, intention and answer.
// 4. Identify genuine skill gaps by comparing the resume with the JD.
// 5. Skill gap severity must be low, medium or high.
// 6. Create a practical 7-day preparation plan.
// 7. Each preparation plan item must contain day, focus and tasks.
// 8. Each tasks field must be an array of strings.
// 9. Set matchScore between 0 and 100.
// 10. Set title using the job title from the JD.
// 11. Do not invent candidate skills or work experience.
// 12. If resume content is unreadable, do not assume its contents.
// 13. Return structured JSON only.

// RESUME:
// ${resume}

// SELF-DESCRIPTION:
// ${selfDescription || "Not provided"}

// JOB DESCRIPTION:
// ${jobDescription}
// `;

//     try {
//         const response = await ai.models.generateContent({
//             model: "gemini-3-flash-preview",
//             contents: prompt,
//             config: {
//                 responseMimeType: "application/json",
//                 responseSchema: reportResponseSchema,
//             },
//         });

//         if (!response.text) {
//             throw new Error("Gemini returned an empty response.");
//         }

//         const parsedReport = JSON.parse(response.text);

//         console.log(
//     "Interview Report:",
//     JSON.stringify(parsedReport, null, 2)
// );


//         // Validate response before returning
//         const validatedReport =
//             interviewReportSchema.parse(parsedReport);

//         console.log("Interview report generated successfully.");

//         return validatedReport;

//     } catch (error) {
//         console.error(
//             "Interview report generation failed:",
//             error.message
//         );

//         throw error;
//     }
// }

// module.exports = generateInterviewReport;










