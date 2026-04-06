/**
 * Gemini API Integration via Supabase Edge Function
 */

const Gemini = (() => {
  const SUPABASE_URL = 'https://pkwbqbxuujpcvndpacsc.supabase.co';
  const PROXY_PATH = '/functions/v1/gemini-proxy';

  async function generate(prompt) {
    const url = `${SUPABASE_URL}${PROXY_PATH}`;
    const body = {
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.85,
        topP: 0.92,
        maxOutputTokens: 8192,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `서버 오류 (${res.status})`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('AI 응답이 비어 있습니다.');
    return text;
  }

  /**
   * 취준생 톤 + AI 냄새 제거 프롬프트
   */
  function buildPrompt({ mappings, company, position, rootText }) {
    const active = mappings.filter((m) => m.sectionKey !== 'skip');

    let prompt = `당신은 20대 중후반 한국인 취업준비생입니다. 지금부터 **본인의 자기소개서**를 직접 쓰는 것처럼 작성하세요.

## 절대 규칙 — "사람이 쓴 글"처럼 보이기

다음 항목을 반드시 지켜야 합니다. 하나라도 어기면 실패입니다.

### 금지 표현 (AI 냄새가 나는 전형적 패턴)
- "~에 기여하고 싶습니다", "강력한 동기입니다" → 취준생은 이렇게 안 씀
- "다양한 경험을 통해", "폭넓은 시각을 갖추었습니다" → 너무 뻔함
- "~라는 가치관을 가지고 있습니다" → 설교조
- "저는 ~한 사람입니다" 로 시작하는 자기소개 → 식상함
- "무한한", "탁월한", "뛰어난", "남다른" → 과장 형용사
- 같은 문장 구조를 연속 반복 (예: "~했습니다. ~했습니다. ~했습니다.")
- 모든 문단이 비슷한 길이, 비슷한 톤으로 정렬되는 것 → 기계적
- "이러한 경험은 ~의 밑거름이 되었습니다" → AI 단골 마무리
- 각 섹션 마지막에 "~하겠습니다"로 끝나는 다짐형 클로징 반복

### 반드시 지킬 것
- 문장 길이를 들쑥날쑥하게: 짧은 문장(5~10자)과 긴 문장을 섞기
- 구어체 섞기: "솔직히", "사실", "그때 처음으로", "돌이켜보면" 같은 표현
- 구체적 디테일: 날짜, 시간, 장소, 인원수, 도구명 등 사소한 사실
- 감정 표현: "막막했다", "뿌듯했다", "쪽팔렸다", "의아했다" 같은 솔직한 감정
- 약간의 불완전함: 완벽한 스토리가 아니라 시행착오, 실수, 고민이 드러나게
- 2~3문장마다 문단 나누기 (빈 줄)
- 두괄식: 각 섹션 첫 문장에 핵심 메시지를 두되, "~입니다"보다 "~었다", "~게 됐다" 같은 서술형도 활용

## 지원 정보
`;
    if (company) prompt += `- 회사: ${company}\n`;
    if (position) prompt += `- 직무: ${position}\n`;
    prompt += `- 마인드맵 주제: ${rootText}\n\n`;

    prompt += `## 섹션별 소재 (마인드맵에서 추출)\n\n`;

    for (const m of active) {
      const guide = Generator.GUIDES[m.sectionKey];
      const sectionTitle = guide ? guide.title : m.branchText;

      prompt += `### ${sectionTitle}\n`;
      if (m.children && m.children.length > 0) {
        const safe = (s) => s.replace(/[\r\n]/g, ' ').substring(0, 500);
        for (const child of m.children) {
          prompt += `- ${safe(child.text)}\n`;
          if (child.children) {
            for (const sub of child.children) prompt += `  - ${safe(sub.text)}\n`;
          }
        }
      } else {
        prompt += `- (사용자가 추가한 커스텀 섹션: "${m.branchText}"에 대해 자연스럽게 작성)\n`;
      }
      prompt += '\n';
    }

    prompt += `## 출력 형식

- 마크다운 형식
- 제목: \`# 자기소개서\`${company ? ` (${company}${position ? ' | ' + position : ''})` : ''}
- 각 섹션: \`## 섹션명\`
- 각 섹션 200~400자
- 2~3문장마다 빈 줄로 문단 구분
- 가이드/지시문/코드블록 없이 본문만 출력
- 마크다운 코드블록(\`\`\`)으로 감싸지 말 것

가장 중요한 것: 채용담당자가 읽었을 때 "이 사람이 직접 고민하며 썼구나"라고 느끼게 하세요. AI가 썼다는 의심이 들면 안 됩니다.`;

    return prompt;
  }

  /**
   * 긴 문단 자동 분리
   */
  function splitLongParagraphs(md) {
    return md.split('\n').map((line) => {
      if (!line || /^(\s*[-*>#|`]|\s*\d+\.|#{1,6}\s)/.test(line)) return line;
      const sentences = line.split(/(?<=다\.|요\.|음\.|니다\.|세요\.|습니다\.|됩니다\.|입니다\.|있습니다\.|했습니다\.|겠습니다\.|합니다\.|봅니다\.|갑니다\.|었다\.|였다\.|었는데\.|인데\.)\s+/);
      if (sentences.length <= 2) return line;
      const chunks = [];
      for (let i = 0; i < sentences.length; i += 2) {
        chunks.push(sentences.slice(i, i + 2).join(' '));
      }
      return chunks.join('\n\n');
    }).join('\n');
  }

  async function generateCoverLetter(params) {
    const prompt = buildPrompt(params);
    const raw = await generate(prompt);
    const cleaned = raw.replace(/^```(?:markdown|md)?\n?/i, '').replace(/\n?```$/i, '').trim();
    return splitLongParagraphs(cleaned);
  }

  return { generate, buildPrompt, generateCoverLetter };
})();
