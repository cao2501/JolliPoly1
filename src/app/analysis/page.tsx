"use client";

import { useState } from 'react';
import { getCareerAdvice, CareerAdviceResponse, Course } from '@/lib/together';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import ChatBot from '@/components/ChatBot';
import * as XLSX from 'xlsx';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import Image from 'next/image';

ChartJS.register(ArcElement, Tooltip, Legend);

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

async function parseTranscript(file: File): Promise<Course[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error('Không thể đọc dữ liệu từ file');
        }

        console.log('File type:', file.type);
        console.log('File name:', file.name);
        
        let courses: Course[] = [];
        
        // Handle different file types
        if (file.type === 'text/csv') {
          // Parse CSV
          const content = data as string;
          const lines = content.split('\n');
          // Skip header row
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const [name, grade, credits] = line.split(',').map(item => item.trim());
            if (name && grade && credits) {
              courses.push({
                name: String(name),
                grade: parseFloat(String(grade)),
                credits: parseInt(String(credits))
              });
            }
          }
        } else if (file.type === 'application/vnd.ms-excel' || 
                  file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
          // Parse Excel
          const workbook = XLSX.read(data, { type: 'array' });
          console.log('Workbook sheets:', workbook.SheetNames);
          
          if (workbook.SheetNames.length === 0) {
            throw new Error('File không chứa sheet nào');
          }

          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json<any[]>(firstSheet, { 
            header: 1,
            raw: false,
            defval: ''
          });
          
          console.log('Raw Excel data:', jsonData);
          
          if (jsonData.length === 0) {
            throw new Error('Không tìm thấy dữ liệu trong sheet');
          }

          // Find header row (row containing "Môn" column)
          const headerRow = jsonData.findIndex((row: any[]) => 
            row.some((cell: string) => String(cell).includes('Môn'))
          );

          if (headerRow === -1) {
            throw new Error('Không tìm thấy hàng tiêu đề trong file Excel');
          }

          const headers = jsonData[headerRow] as string[];
          const nameColIndex = headers.findIndex((h: string) => String(h).includes('Môn'));
          const gradeColIndex = headers.findIndex((h: string) => String(h).includes('Thang điểm 10'));
          const creditsColIndex = headers.findIndex((h: string) => String(h).includes('Số tín chỉ'));

          if (nameColIndex === -1 || gradeColIndex === -1 || creditsColIndex === -1) {
            throw new Error('Không tìm thấy các cột cần thiết trong file Excel');
          }

          // Process data rows
          courses = jsonData.slice(headerRow + 1)
            .filter((row: any[]) => {
              // Skip empty rows and rows without course data
              return row.length > 0 && 
                     row[nameColIndex] && 
                     String(row[nameColIndex]).trim() !== '' &&
                     !String(row[nameColIndex]).includes('Bảng điểm');
            })
            .map((row: any[]) => {
              const name = String(row[nameColIndex] || '').trim();
              const grade = String(row[gradeColIndex] || '0').trim();
              const credits = String(row[creditsColIndex] || '0').trim();

              return {
                name,
                grade: parseFloat(grade) || 0,
                credits: parseInt(credits) || 0
              };
            });
        } else if (file.type === 'application/pdf') {
          // Parse PDF
          const pdf = await pdfjs.getDocument({ data: data }).promise;
          const numPages = pdf.numPages;
          let textContent = '';

          for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            textContent += content.items.map((item: any) => item.str).join(' ') + '\n';
          }

          // Parse text content
          const lines = textContent.split('\n');
          for (const line of lines) {
            // Look for patterns like "Môn học: X, Điểm: Y, Tín chỉ: Z"
            const match = line.match(/Môn học:\s*([^,]+),\s*Điểm:\s*(\d+(?:\.\d+)?),\s*Tín chỉ:\s*(\d+)/);
            if (match) {
              courses.push({
                name: match[1].trim(),
                grade: parseFloat(match[2]),
                credits: parseInt(match[3])
              });
            }
          }
        } else if (file.type.startsWith('image/')) {
          // For image files, we'll need to implement OCR
          // For now, we'll return a mock response
          courses = [
            { name: 'Toán học', grade: 8.5, credits: 3 },
            { name: 'Lập trình Python', grade: 9.0, credits: 4 },
            { name: 'Cấu trúc dữ liệu', grade: 8.0, credits: 3 },
            { name: 'Machine Learning', grade: 9.5, credits: 4 },
            { name: 'Xử lý dữ liệu', grade: 8.5, credits: 3 },
          ];
        } else {
          throw new Error('Định dạng file không được hỗ trợ');
        }
        
        // Filter invalid courses
        courses = courses.filter((course: Course) => {
          const isValid = course.name && 
            !isNaN(course.grade) && 
            !isNaN(course.credits);
          
          if (!isValid) {
            console.log('Filtered out invalid course:', course);
          }
          
          return isValid;
        });
        
        console.log('Final courses:', courses);
        
        if (courses.length === 0) {
          throw new Error('Không tìm thấy dữ liệu môn học hợp lệ trong file');
        }
        
        resolve(courses);
      } catch (error) {
        console.error('Error details:', error);
        reject(new Error(`Không thể đọc dữ liệu từ file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = (error: ProgressEvent<FileReader>) => {
      console.error('FileReader error:', error);
      reject(new Error('Không thể đọc file. Vui lòng thử lại.'));
    };
    
    try {
      // Read file based on type
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    } catch (error) {
      console.error('Error reading file:', error);
      reject(new Error('Không thể đọc file. Vui lòng kiểm tra định dạng file.'));
    }
  });
}

export default function Analysis() {
  const [step, setStep] = useState(1);
  const [selectedMajor, setSelectedMajor] = useState<string>('');
  const [transcript, setTranscript] = useState<File | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [favoriteSubjects, setFavoriteSubjects] = useState<string[]>([]);
  const [personalInterests, setPersonalInterests] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [questions, setQuestions] = useState('');
  const [advice, setAdvice] = useState<CareerAdviceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [compatibilityScores, setCompatibilityScores] = useState<{[key: string]: number}>({});

  const majors = [
    { 
      id: 'ai', 
      name: 'Lập trình AI',
      description: 'Phát triển trí tuệ nhân tạo và học máy',
      icon: '🤖',
      skills: ['Python', 'Machine Learning', 'Deep Learning', 'Data Analysis'],
      careerPaths: ['AI Engineer', 'Data Scientist', 'ML Engineer', 'Research Scientist']
    },
    { 
      id: 'game', 
      name: 'Lập trình Game',
      description: 'Xây dựng game và ứng dụng tương tác',
      icon: '🎮',
      skills: ['Unity', 'C#', '3D Modeling', 'Game Design'],
      careerPaths: ['Game Developer', 'Game Designer', 'Unity Developer', 'Technical Artist']
    },
    { 
      id: 'web', 
      name: 'Lập trình Web',
      description: 'Phát triển website và ứng dụng web',
      icon: '🌐',
      skills: ['HTML/CSS', 'JavaScript', 'React', 'Node.js'],
      careerPaths: ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Web Designer']
    },
    { 
      id: 'mobile', 
      name: 'Lập trình Mobile',
      description: 'Xây dựng ứng dụng di động',
      icon: '📱',
      skills: ['Swift', 'Kotlin', 'React Native', 'Flutter'],
      careerPaths: ['iOS Developer', 'Android Developer', 'Mobile App Developer', 'Cross-platform Developer']
    }
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || 
          file.type === 'application/vnd.ms-excel' || 
          file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.type === 'text/csv') {
        setTranscript(file);
        try {
          const parsedCourses = await parseTranscript(file);
          setCourses(parsedCourses);
          setStep(3); // Move to next step after successful parsing
        } catch (error) {
          console.error('Error parsing transcript:', error);
          alert('Có lỗi khi đọc bảng điểm. Vui lòng thử lại.');
        }
      } else {
        alert('Vui lòng chọn file Excel, CSV hoặc PDF');
      }
    }
  };

  const handleSubjectToggle = (subject: string) => {
    setFavoriteSubjects(prev => {
      const newSubjects = prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject];
      
      // Calculate compatibility scores based on selected subjects and their grades
      const scores: {[key: string]: number} = {};
      Object.entries(majors).forEach(([_, major]) => {
        const selectedCourses = courses.filter(course => 
          newSubjects.includes(course.name)
        );
        
        if (selectedCourses.length > 0) {
          const totalScore = selectedCourses.reduce((sum, course) => sum + course.grade, 0);
          const averageScore = totalScore / selectedCourses.length;
          scores[major.id] = Math.round(averageScore * 10); // Convert to percentage
        }
      });
      
      setCompatibilityScores(scores);
      return newSubjects;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMajor) {
      alert('Vui lòng chọn chuyên ngành trước');
      return;
    }
    if (!transcript) {
      alert('Vui lòng tải lên bảng điểm');
      return;
    }
    if (favoriteSubjects.length === 0) {
      alert('Vui lòng chọn ít nhất một môn học yêu thích');
      return;
    }
    if (!personalInterests.trim()) {
      alert('Vui lòng nhập sở thích cá nhân');
      return;
    }
    setLoading(true);
    try {
      // Convert transcript file to string
      let transcriptText = '';
      if (transcript) {
        const courses = await parseTranscript(transcript);
        transcriptText = courses.map(course => 
          `${course.name}: ${course.grade} điểm (${course.credits} tín chỉ)`
        ).join('\n');
      }

      const response = await getCareerAdvice({
        major: selectedMajor,
        interests: [...favoriteSubjects, personalInterests],
        skills,
        questions,
        transcript: transcriptText
      });
      setAdvice(response);
      setStep(5); // Move to results step
    } catch (error) {
      console.error('Error getting career advice:', error);
    }
    setLoading(false);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Tư Vấn Ngành Hẹp Công Nghệ Thông Tin</h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Tìm hiểu và lựa chọn chuyên ngành phù hợp với đam mê và khả năng của bạn
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {majors.map((major) => (
                <button
                  key={major.id}
                  type="button"
                  onClick={() => {
                    setSelectedMajor(major.id);
                    setStep(2);
                  }}
                  className={`group relative overflow-hidden rounded-2xl border-2 text-left transition-all duration-300 hover:scale-[1.02] ${
                    selectedMajor === major.id 
                      ? 'border-primary bg-primary/5 shadow-lg' 
                      : 'border-gray-200 hover:border-primary/50 hover:shadow-md'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <span className="text-5xl transform group-hover:scale-110 transition-transform duration-300">
                        {major.icon}
                      </span>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{major.name}</h3>
                        <p className="text-gray-600">{major.description}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Kỹ năng chính:</h4>
                        <div className="flex flex-wrap gap-2">
                          {major.skills.map((skill, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Cơ hội nghề nghiệp:</h4>
                        <div className="flex flex-wrap gap-2">
                          {major.careerPaths.map((path, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                            >
                              {path}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                </button>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-gray-500 text-sm">
                Chọn một chuyên ngành để bắt đầu hành trình khám phá sự nghiệp của bạn
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Tải Lên Bảng Điểm Của Bạn</h2>
              <p className="text-lg text-gray-600">
                Chia sẻ bảng điểm để chúng tôi có thể phân tích và đưa ra lời khuyên phù hợp
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary/50 transition-colors duration-200">
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <div className="text-center">
                    <label
                      htmlFor="transcript-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-secondary focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                    >
                      <span className="text-lg">Tải lên file</span>
                      <input
                        id="transcript-upload"
                        name="transcript-upload"
                        type="file"
                        className="sr-only"
                        accept=".xlsx,.xls,.csv,.pdf,image/*"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="mt-2 text-gray-600">hoặc kéo thả file vào đây</p>
                  </div>
                  <p className="text-sm text-gray-500">
                    Hỗ trợ file Excel, CSV hoặc PDF (tối đa 10MB)
                  </p>
                </div>
              </div>

              {transcript && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-gray-700">{transcript.name}</span>
                  </div>
                  <button
                    onClick={() => setTranscript(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Sở Thích Và Đam Mê</h2>
              <p className="text-lg text-gray-600">
                Chọn các môn học yêu thích và chia sẻ sở thích cá nhân của bạn
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Môn học yêu thích
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {courses.map((course) => (
                      <button
                        key={course.name}
                        type="button"
                        onClick={() => handleSubjectToggle(course.name)}
                        className={`p-4 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.02] ${
                          favoriteSubjects.includes(course.name)
                            ? 'border-primary bg-primary/10 shadow-md'
                            : 'border-gray-200 hover:border-primary/50'
                        }`}
                      >
                        <div className="font-medium text-gray-900 mb-1">{course.name}</div>
                        <div className="flex items-center text-sm text-gray-600 space-x-4">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            {course.grade} điểm
                          </span>
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {course.credits} tín chỉ
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Sở thích cá nhân
                  </h3>
                  <textarea
                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring-primary min-h-[120px]"
                    placeholder="Mô tả sở thích và đam mê của bạn trong lĩnh vực công nghệ..."
                    value={personalInterests}
                    onChange={(e) => setPersonalInterests(e.target.value)}
                  />
                </div> */}

                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="w-full py-3 px-4 border border-transparent rounded-xl shadow-sm text-lg font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
                >
                  Tiếp tục
                </button>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Thông Tin Bổ Sung</h2>
              <p className="text-lg text-gray-600">
                Chia sẻ thêm về kỹ năng và câu hỏi của bạn
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Kỹ năng của bạn
                  </h3>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                      placeholder="Nhập các kỹ năng của bạn, phân cách bằng dấu phẩy (ví dụ: JavaScript, Python, SQL)"
                      onChange={(e) => setSkills(e.target.value.split(',').map(s => s.trim()))}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Câu hỏi của bạn
                  </h3>
                  <textarea
                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring-primary min-h-[150px]"
                    placeholder="Bạn quan tâm đến những khía cạnh nào của chuyên ngành này? Có câu hỏi gì về cơ hội nghề nghiệp không?"
                    onChange={(e) => setQuestions(e.target.value)}
                  />
                </div> */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Sở thích cá nhân
                  </h3>
                  <textarea
                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring-primary min-h-[120px]"
                    placeholder="Mô tả sở thích và đam mê của bạn trong lĩnh vực công nghệ..."
                    value={personalInterests}
                    onChange={(e) => setPersonalInterests(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full py-3 px-4 border border-transparent rounded-xl shadow-sm text-lg font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Đang phân tích...
                    </div>
                  ) : (
                    'Nhận tư vấn'
                  )}
                </button>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Kết Quả Phân Tích</h2>
              <p className="text-lg text-gray-600">
                Dựa trên thông tin bạn cung cấp, đây là kết quả phân tích và lời khuyên của chúng tôi
              </p>
            </div>

            {advice && (
              <div className="space-y-8">
                {/* Biểu đồ tương thích */}
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Mức Độ Phù Hợp</h3>
                  <div className="max-w-md mx-auto">
                    {chartData && <Pie data={chartData} />}
                  </div>
                </div>

                {/* Phân tích chuyên ngành */}
                {advice.specializations.map((spec, index) => (
                  <div key={index} className="bg-white rounded-2xl shadow-lg p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">{spec.name}</h3>
                        <p className="text-gray-600">{spec.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-primary mb-1">{spec.percentage}%</div>
                        <div className="text-sm text-gray-500">Mức độ phù hợp</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Kỹ năng cần thiết</h4>
                        <div className="space-y-3">
                          {(spec.requiredSkills || []).map((skill, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="text-gray-700">{skill.skill}</span>
                              <div className="flex items-center">
                                <div className="w-24 h-2 bg-gray-200 rounded-full mr-2">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${skill.match}%` }}
                                  />
                                </div>
                                <span className="text-sm text-gray-600">{skill.match}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Lộ trình phát triển</h4>
                        <div className="space-y-2">
                          {(spec.careerPath || []).map((path, idx) => (
                            <div key={idx} className="flex items-start">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mr-3 mt-1">
                                <span className="text-primary text-sm">{idx + 1}</span>
                              </div>
                              <span className="text-gray-700">{path}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Ưu điểm</h4>
                        <ul className="space-y-2">
                          {(spec.pros || []).map((pro, idx) => (
                            <li key={idx} className="flex items-start">
                              <svg className="w-5 h-5 text-green-500 mr-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-gray-700">{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Thách thức</h4>
                        <ul className="space-y-2">
                          {(spec.cons || []).map((con, idx) => (
                            <li key={idx} className="flex items-start">
                              <svg className="w-5 h-5 text-red-500 mr-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span className="text-gray-700">{con}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Đề xuất chuyên ngành */}
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Đề Xuất Chuyên Ngành</h3>
                  <div className="bg-primary/5 rounded-xl p-6">
                    <h4 className="text-xl font-semibold text-primary mb-3">
                      {advice.recommendedPath.name}
                    </h4>
                    <p className="text-gray-700 mb-4">{advice.recommendedPath.reason}</p>
                    <div>
                      <h5 className="text-lg font-semibold text-gray-900 mb-3">Các bước tiếp theo</h5>
                      <div className="space-y-3">
                        {(advice.recommendedPath.nextSteps || []).map((step, idx) => (
                          <div key={idx} className="flex items-start">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center mr-3 mt-1">
                              <span className="text-white text-sm">{idx + 1}</span>
                            </div>
                            <span className="text-gray-700">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const chartData = Array.isArray(advice?.specializations) && advice.specializations.length ? {
    labels: advice.specializations.map(spec => spec.name),
    datasets: [
      {
        data: advice.specializations.map(spec => spec.percentage),
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  } : null;

  return (
    <main className="bg-white min-h-screen py-12">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          {renderStep()}
        </div>
        <ChatBot />
      </div>
    </main>
  );
} 