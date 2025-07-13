// LLM服务 - 用于生成诗歌词汇

interface GenerateWordsRequest {
  title: string;
  wordCount: number;
  theme?: string;
}

interface GenerateWordsResponse {
  words: string[];
}

// 配置LLM API
const LLM_CONFIG = {
  // 可以使用OpenAI、Claude、或其他LLM API
  apiUrl: import.meta.env.VITE_LLM_API_URL || 'https://api.openai.com/v1/chat/completions',
  // 从环境变量获取API密钥，如果没有则使用默认值
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  model: import.meta.env.VITE_LLM_MODEL || 'gpt-4o-mini'
};

// 生成词汇的提示词模板
function createPrompt(title: string, wordCount: number, previousWords: string[] = []): string {
  const contextInfo = previousWords.length > 0 
    ? `\n\n已生成的词汇上下文：${previousWords.join('、')}\n请确保新生成的词汇与这些词汇在意境、情感或主题上有所关联，形成连贯的诗歌氛围。`
    : '';
    
  return `你是一个专业的诗歌创作助手。请根据主题"${title}"生成10个适合诗歌创作的${wordCount}字词汇。${contextInfo}

要求：
1. 与主题"${title}"相关
2. 每个词汇恰好${wordCount}个字
3. 词汇要富有诗意和美感
4. 如果有上下文词汇，新词汇应与之形成呼应或递进关系
5. 适合用于现代诗歌创作
6. 避免重复已有词汇

请直接返回10个${wordCount}字词汇，每行一个，不要添加序号或其他说明文字。

示例格式：
春风
明月
落花`;
}

// 使用LLM API生成词汇（支持上下文）
export async function generateWordsWithLLM(request: GenerateWordsRequest & { previousWords?: string[] }): Promise<string[]> {
  try {
    // 如果没有配置API密钥，使用备用方案
    if (!LLM_CONFIG.apiKey) {
      console.warn('未配置LLM API密钥，使用备用词汇生成方案');
      return generateFallbackWords(request.wordCount);
    }

    const prompt = createPrompt(request.title, request.wordCount, request.previousWords);
    
    const response = await fetch(LLM_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: LLM_CONFIG.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      throw new Error(`LLM API请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('LLM API返回内容为空');
    }

    // 解析返回的词汇
    const allWords = content
      .split('\n')
      .map((word: string) => word.trim())
      .filter((word: string) => word.length > 0);
    
    console.log('LLM原始返回内容:', content);
    console.log('解析后的所有词汇:', allWords);
    console.log('请求的词汇字数:', request.wordCount);
    
    // 优先选择符合字数要求的词汇
    const exactWords = allWords.filter((word: string) => word.length === request.wordCount);
    
    // 如果符合字数的词汇不足，选择接近字数的词汇
    const closeWords = allWords.filter((word: string) => 
      Math.abs(word.length - request.wordCount) <= 1 && word.length !== request.wordCount
    );
    
    // 组合词汇：优先精确匹配，然后是接近匹配
    const words = [...exactWords, ...closeWords].slice(0, 10);
    
    console.log('符合字数要求的词汇:', exactWords);
    console.log('接近字数要求的词汇:', closeWords);
    console.log('最终选择的词汇:', words);
    
    // 如果生成的词汇不足3个，用备用方案补充
    if (words.length < 3) {
      console.warn(`LLM生成词汇不足(${words.length}个)，使用备用方案补充`);
      const fallbackWords = generateFallbackWords(request.wordCount);
      words.push(...fallbackWords.slice(0, 10 - words.length));
    }

    return words;
  } catch (error) {
    console.error('LLM词汇生成失败:', error);
    // 发生错误时使用备用方案
    return generateFallbackWords(request.wordCount);
  }
}

// 备用词汇生成方案（当LLM API不可用时使用）
function generateFallbackWords(wordCount: number): string[] {
  const fallbackWords: Record<number, string[]> = {
    1: ['月', '风', '花', '雪', '云', '水', '山', '海', '星', '夜', '春', '秋', '梦', '情', '思'],
    2: ['春风', '明月', '落花', '流水', '白云', '青山', '夜雨', '晨光', '秋叶', '冬雪', '诗心', '远方', '时光', '记忆', '温柔'],
    3: ['春风起', '明月照', '落花飞', '流水去', '白云散', '青山远', '夜雨声', '晨光暖', '秋叶黄', '冬雪白', '诗意浓', '梦如烟', '情如水', '思如潮', '心如镜'],
    4: ['春风又绿', '明月几时', '落花时节', '流水无情', '白云千载', '青山不老', '夜雨敲窗', '晨光透帘', '秋叶满山', '冬雪大地', '诗意在心', '梦境如画', '情深似海', '思绪如云', '心境如水'],
  };

  const words = fallbackWords[wordCount] || [`${wordCount}字词`];
  return [...words].sort(() => Math.random() - 0.5).slice(0, 10);
}

// 顺序生成多个格子的词汇（保持连贯性）
export async function generateWordsForCells(title: string, cellRequests: { cellId: string; wordCount: number }[]): Promise<Record<string, string[]>> {
  const results: Record<string, string[]> = {};
  const allGeneratedWords: string[] = []; // 存储所有已生成的词汇作为上下文
  
  // 按顺序生成每个格子的词汇，确保连贯性
  for (const request of cellRequests) {
    try {
      const words = await generateWordsWithLLM({
        title,
        wordCount: request.wordCount,
        previousWords: allGeneratedWords.slice(-15) // 只保留最近15个词汇作为上下文，避免提示词过长
      });
      
      results[request.cellId] = words;
      
      // 将新生成的词汇添加到上下文中（取每个词汇列表的前3个作为代表）
      allGeneratedWords.push(...words.slice(0, 3));
      
      // 添加小延迟，避免API请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error(`生成格子 ${request.cellId} 词汇失败:`, error);
      // 如果某个格子生成失败，使用备用方案
      results[request.cellId] = generateFallbackWords(request.wordCount);
    }
  }

  return results;
}

// 带进度回调的词汇生成函数
export async function generateWordsForCellsWithProgress(
  title: string, 
  cellRequests: { cellId: string; wordCount: number }[],
  onProgress?: (current: number, total: number) => void
): Promise<Record<string, string[]>> {
  const results: Record<string, string[]> = {};
  const allGeneratedWords: string[] = [];
  const total = cellRequests.length;
  
  for (let i = 0; i < cellRequests.length; i++) {
    const request = cellRequests[i];
    
    try {
      const words = await generateWordsWithLLM({
        title,
        wordCount: request.wordCount,
        previousWords: allGeneratedWords.slice(-15)
      });
      
      results[request.cellId] = words;
      allGeneratedWords.push(...words.slice(0, 3));
      
      // 添加延迟
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error(`生成格子 ${request.cellId} 词汇失败:`, error);
      results[request.cellId] = generateFallbackWords(request.wordCount);
    }
    
    // 更新进度：当前完成的数量
    onProgress?.(i + 1, total);
  }
  
  return results;
}