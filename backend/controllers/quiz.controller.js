import { GoogleGenerativeAI } from "@google/generative-ai";
import pdfParse from "pdf-parse";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateQuizFromPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Không tìm thấy file PDF!" });
    }

    const fileBuffer = req.file.buffer;
    const pdfData = await pdfParse(fileBuffer);
    const documentText = pdfData.text;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Bạn là một chuyên gia học thuật. Hãy đọc nội dung tài liệu sau và tạo ra một bài trắc nghiệm 5 câu hỏi.
      
      YÊU CẦU BẮT BUỘC: 
      - Chỉ trả về ĐÚNG một chuỗi JSON chuẩn.
      - Phần 'explanation' phải giải thích chi tiết từng bước.
      
      Cấu trúc JSON mong muốn:
      [
        {
          "question_text": "Nội dung câu hỏi?",
          "options": ["Lựa chọn 1", "Lựa chọn 2", "Lựa chọn 3", "Lựa chọn 4"],
          "correct_index": 0,
          "explanation": "Giải thích chi tiết vì sao chọn đáp án này...",
          "topic_tag": "Tên chủ đề"
        }
      ]
      
      Tài liệu:
      ${documentText.substring(0, 30000)}
    `;

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
    });
    
    const responseText = result.response.text();
    const quizQuestions = JSON.parse(responseText);

    res.status(200).json({ success: true, data: quizQuestions });
  } catch (error) {
    console.error("Lỗi AI hoặc Parse PDF:", error);
    res.status(500).json({ success: false, message: "Đã xảy ra lỗi trên server." });
  }
};