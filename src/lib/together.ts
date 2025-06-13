import axios from 'axios'; 

const TOGETHER_API_KEY = '29ca24660493731f4908337026d8bfccbddb1c3192c271a289c9955359630678';

export const togetherClient = axios.create({
  baseURL: 'https://api.together.xyz/v1',
  headers: {
    'Authorization': `Bearer ${TOGETHER_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

export interface CareerAdviceRequest {
  major: string;
  interests: string[];
  skills: string[];
  questions: string;
  transcript: string;
}

export interface SkillAnalysis {
  skill: string;
  match: number;
  importance: number;
}

export interface SpecializationAnalysis {
  name: string;
  percentage: number;
  description: string;
  requiredSkills: SkillAnalysis[];
  careerPath: string[];
  pros: string[];
  cons: string[];
  marketDemand: number;
  salaryRange: string;
  learningCurve: number;
}

export interface CareerAdviceResponse {
  evaluation: string;
  advice: string;
  specializations: {
    name: string;
    description: string;
    percentage: number;
    requiredSkills: {
      skill: string;
      match: number;
    }[];
    careerPath: string[];
    marketDemand: number;
    salaryRange: string;
    learningCurve: number;
    pros: string[];
    cons: string[];
  }[];
  recommendedPath: {
    name: string;
    reason: string;
    nextSteps: string[];
  };
}

export interface Course {
  name: string;
  grade: number;
  credits: number;
  semester?: string;
}

export async function parseTranscript(file: File): Promise<Course[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = reader.result as string;
        const lines = content.split('\n');
        const courses = lines.slice(1).map(line => {
          const [name, grade, credits, semester] = line.split(',').map(i => i.trim());
          return { name, grade: parseFloat(grade), credits: parseInt(credits), semester };
        });
        resolve(courses);
      } catch (err) {
        reject(new Error('Lỗi khi đọc file'));
      }
    };
    reader.onerror = () => reject(new Error('Lỗi khi đọc file'));
    reader.readAsText(file);
  });
}

function summarizeTranscript(courses: Course[]): string {
  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
  const totalWeightedScore = courses.reduce((sum, c) => sum + c.grade * c.credits, 0);
  const averageGPA = (totalWeightedScore / totalCredits).toFixed(2);

  const topCourses = [...courses].sort((a, b) => b.grade - a.grade).slice(0, 3);
  const bottomCourses = [...courses].sort((a, b) => a.grade - b.grade).slice(0, 3);

  return `GPA trung bình: ${averageGPA}\nTổng tín chỉ: ${totalCredits}\nMôn điểm cao: ${topCourses.map(c => `${c.name} (${c.grade})`).join(', ')}\nMôn điểm thấp: ${bottomCourses.map(c => `${c.name} (${c.grade})`).join(', ')}`;
}

// ====== Type Definitions ======
interface TogetherResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

async function extractSkillsFromTranscript(courses: Course[], major: string): Promise<string[]> {
  const courseNames = courses.map(c => c.name).join(', ');

  try {
    const response = await togetherClient.post<TogetherResponse>('/chat/completions', {
      model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
      messages: [
        {
          role: 'system',
          content: `Bạn là một chuyên gia giáo dục và hướng nghiệp.
Hãy phân tích danh sách các môn học và trích xuất các kỹ năng kỹ thuật liên quan mà sinh viên đã học được. 
- Trả về một mảng JSON chứa các kỹ năng (tên viết hoa, giữ nguyên tiếng Anh nếu là thuật ngữ).
- Chỉ trích xuất các kỹ năng thực sự liên quan đến ngành ${major}.
- KHÔNG TRẢ VỀ GIẢI THÍCH, CHỈ TRẢ VỀ MẢNG JSON.`
        },
        {
          role: 'user',
          content: `Dưới đây là danh sách môn học của sinh viên:\n${courseNames}`
        }
      ],
      temperature: 0.5,
      max_tokens: 500,
      response_format: "json"
    });

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('Không nhận được nội dung từ API');
      return [];
    }

    try {
      const skills = JSON.parse(content);
      if (!Array.isArray(skills)) {
        console.error('Dữ liệu trả về không phải mảng:', content);
        return [];
      }
      return skills;
    } catch (parseError) {
      console.error('Lỗi khi parse JSON:', parseError);
      return [];
    }
  } catch (err) {
    console.error('Lỗi khi phân tích kỹ năng từ bảng điểm:', err);
    return [];
  }
}

// ======= MÀU SẮC BIỂU ĐỒ PHÙ HỢP =======
export const percentageColors = [
  '#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0',
  '#00bcd4', '#ffc107', '#795548', '#3f51b5', '#607d8b',
];

export async function getCareerAdvice(request: CareerAdviceRequest): Promise<CareerAdviceResponse> {
  try {
    const parsedCourses: Course[] = request.transcript.includes(',') ? request.transcript.split('\n').map(line => {
      const [name, grade, credits] = line.split(',');
      return { name: name.trim(), grade: parseFloat(grade), credits: parseInt(credits) };
    }) : [];

    const autoExtractedSkills = await extractSkillsFromTranscript(parsedCourses, request.major);
    const uniqueSkills = Array.from(new Set([...request.skills, ...autoExtractedSkills]));
    request.skills = uniqueSkills;

    const transcriptSummary = summarizeTranscript(parsedCourses);

    const response = await togetherClient.post<TogetherResponse>('/chat/completions', {
      model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
      messages: [
        {
          role: 'system',
          content: `Bạn là một chuyên gia tư vấn hướng nghiệp trong lĩnh vực công nghệ thông tin. 
          Nhiệm vụ của bạn là phân tích thông tin của sinh viên và đưa ra lời khuyên về chuyên ngành phù hợp.
          Yêu cầu:
          1. Tất cả nội dung phải được viết bằng tiếng Việt
          2. Sử dụng ngôn ngữ dễ hiểu, thân thiện
          3. Đưa ra các ví dụ cụ thể và thực tế
          4. Giải thích rõ ràng lý do cho mỗi đề xuất
          5. Đánh giá tổng quan về năng lực học tập của sinh viên dựa trên bảng điểm
          6. PHẢI TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON NHƯ SAU, KHÔNG THÊM BẤT KỲ KÝ TỰ NÀO KHÁC:
          {
            "evaluation": "Đánh giá tổng quan học lực",
            "advice": "Lời khuyên",
            "specializations": [
              {
                "name": "Tên chuyên ngành hẹp",
                "description": "Mô tả chi tiết về chuyên ngành",
                "percentage": 85,
                "requiredSkills": [
                  {
                    "skill": "Tên kỹ năng cần thiết",
                    "match": 90
                  }
                ],
                "careerPath": ["Các bước phát triển trong sự nghiệp"],
                "marketDemand": 90,
                "salaryRange": "Mức lương tham khảo",
                "learningCurve": 80,
                "pros": ["Các ưu điểm của chuyên ngành"],
                "cons": ["Các nhược điểm cần lưu ý"]
              }
            ],
            "recommendedPath": {
              "name": "Chuyên ngành được đề xuất nhất",
              "reason": "Lý do tại sao đề xuất chuyên ngành này",
              "nextSteps": ["Các bước tiếp theo để phát triển"]
            }
          }`
        },
        {
          role: 'user',
          content: `Hãy phân tích và đưa ra lời khuyên về chuyên ngành phù hợp dựa trên thông tin sau:

Chuyên ngành chính: ${request.major}
Tóm tắt bảng điểm:
${transcriptSummary}

Chi tiết bảng điểm:
${request.transcript}

Sở thích: ${request.interests.join(', ')}
Kỹ năng: ${request.skills.join(', ')}
Câu hỏi thêm: ${request.questions}`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: "json"
    });

    const rawContent = response.data.choices?.[0]?.message?.content;
    if (!rawContent) {
      console.error('Không nhận được nội dung từ API');
      throw new Error('Không nhận được phản hồi từ hệ thống');
    }

    try {
      const jsonStart = rawContent.indexOf('{');
      const jsonEnd = rawContent.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) {
        console.error('Không tìm thấy định dạng JSON hợp lệ trong:', rawContent);
        throw new Error('Không tìm thấy định dạng JSON hợp lệ');
      }

      const cleanJson = rawContent.slice(jsonStart, jsonEnd + 1);
      const aiResponse = JSON.parse(cleanJson);

      if (!aiResponse.evaluation || !aiResponse.advice || !Array.isArray(aiResponse.specializations) || !aiResponse.recommendedPath) {
        console.error('Phản hồi không đúng định dạng:', aiResponse);
        throw new Error('Phản hồi từ hệ thống không đúng định dạng');
      }

      return {
        evaluation: aiResponse.evaluation,
        advice: aiResponse.advice,
        specializations: aiResponse.specializations,
        recommendedPath: aiResponse.recommendedPath
      };
    } catch (parseError) {
      console.error('Lỗi khi parse JSON:', parseError);
      throw new Error('Không thể xử lý phản hồi từ hệ thống');
    }
  } catch (error: any) {
    console.error('Lỗi hệ thống:', error.response?.data || error.message);

    if (error.response?.status === 401) throw new Error('Khóa API không hợp lệ hoặc hết hạn.');
    if (error.response?.status === 402) throw new Error('Đã hết hạn mức sử dụng API.');

    throw new Error('Không thể lấy tư vấn nghề nghiệp. Vui lòng thử lại sau.');
  }
}
