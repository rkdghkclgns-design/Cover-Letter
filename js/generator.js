/**
 * Cover Letter Generator v2
 * 두괄식 작성법 + STAR 기법 + 경험 부족 시 소재 가이드
 */

const Generator = (() => {
  const SECTIONS = [
    { key: 'motivation',       label: '지원동기',       order: 1 },
    { key: 'immersion',        label: '몰입 경험',      order: 2 },
    { key: 'capability',       label: '역량 개발과정',  order: 3 },
    { key: 'core_skill',       label: '핵심 역량',      order: 4 },
    { key: 'personality',      label: '성격 및 가치관', order: 5 },
    { key: 'aspiration',       label: '입사 후 포부',   order: 6 },
    { key: 'growth',           label: '성장 과정',      order: 7 },
    { key: 'teamwork',         label: '협업 경험',      order: 8 },
    { key: 'problem_solving',  label: '문제해결 경험',  order: 9 },
    { key: 'custom',           label: '기타 (직접 작성)', order: 99 },
    { key: 'skip',             label: '(사용 안함)',     order: -1 },
  ];

  /**
   * 섹션별 두괄식 작성 가이드
   * 각 섹션은 결론 먼저 → 근거/과정 → 마무리 구조를 따름
   */
  const GUIDES = {
    motivation: {
      title: '지원동기',
      opening: '이 직무를 선택한 핵심 이유를 한 문장으로 먼저 밝히세요.',
      structure: [
        '**[결론]** 지원 핵심 동기 한 문장',
        '**[근거]** 관심을 갖게 된 구체적 계기',
        '**[연결]** 기업/직무와 나의 접점',
      ],
      star: '상황: 관심을 갖게 된 계기 → 행동: 깊이 탐색한 과정 → 결과: 확신을 갖게 된 순간 → 배움: 이 직무에서 이루고 싶은 것',
      noExp: '일상에서 해당 분야에 관심을 가진 계기(뉴스, 콘텐츠, 주변 사례)도 훌륭한 소재입니다.',
    },
    immersion: {
      title: '몰입 경험',
      opening: '가장 깊이 몰입했던 순간과 그 결과를 먼저 밝히세요.',
      structure: [
        '**[결론]** 몰입의 결과/성과를 먼저 제시',
        '**[과정]** 몰입하게 된 배경과 구체적 행동',
        '**[배움]** 이 경험이 직무에 어떻게 연결되는지',
      ],
      star: '상황: 몰입하게 된 배경 → 행동: 집중한 구체적 노력(기간/방법) → 결과: 달성한 성과 → 배움: 끈기/문제해결력 등',
      noExp: '게임 클리어, 코딩 마라톤, 시험 준비, 취미 마스터링 등 일상적 몰입도 소재가 됩니다.',
    },
    capability: {
      title: '역량 개발과정',
      opening: '현재 보유한 핵심 역량 하나를 먼저 선언하고, 키워온 과정을 풀어가세요.',
      structure: [
        '**[결론]** 현재 보유한 역량과 수준',
        '**[과정]** 어떻게 키워왔는지 (기간, 방법, 실패와 극복)',
        '**[증명]** 역량을 입증하는 구체적 사례',
      ],
      star: '상황: 역량이 부족했던 시점 → 행동: 학습/훈련 과정 → 결과: 도달한 수준 → 배움: 성장 과정에서 깨달은 것',
      noExp: '독학 과정, 온라인 강의 수강, 개인 프로젝트, 자격증 준비 과정 모두 활용 가능합니다.',
    },
    core_skill: {
      title: '핵심 역량',
      opening: '즉시 활용 가능한 역량을 먼저 나열하고, 각각의 활용 방안을 제시하세요.',
      structure: [
        '**[결론]** 보유 역량 목록 (자격증, 기술스택, 포트폴리오)',
        '**[근거]** 각 역량의 검증 가능한 증거',
        '**[활용]** 입사 후 직무에 어떻게 적용할지',
      ],
      star: null,
      noExp: '학교 수업에서 배운 기술, 개인 블로그, 자격증 준비 과정도 핵심 역량입니다.',
    },
    personality: {
      title: '성격 및 가치관',
      opening: '나를 대표하는 강점 한 가지를 먼저 선언하세요.',
      structure: [
        '**[결론]** 핵심 성격 강점 한 문장',
        '**[에피소드]** 강점이 드러난 구체적 상황',
        '**[연결]** 이 강점이 직무에서 어떻게 발휘될지',
      ],
      star: '상황: 강점이 필요했던 상황 → 행동: 성격적 강점을 발휘한 행동 → 결과: 긍정적 결과 → 배움: 강점에 대한 확신',
      noExp: '친구 간 갈등 중재, 모임 기획, 가족 내 역할 등 일상에서 성격이 드러난 에피소드를 찾으세요.',
    },
    aspiration: {
      title: '입사 후 포부',
      opening: '입사 후 이루고 싶은 목표를 먼저 선언하세요.',
      structure: [
        '**[결론]** 궁극적 목표',
        '**[단계]** 1년 → 3년 → 5년 성장 로드맵',
        '**[기여]** 회사와 함께 만들어갈 가치',
      ],
      star: null,
      noExp: '구체적 수치나 단계를 넣으면 실현 가능성이 높아 보입니다.',
    },
    growth: {
      title: '성장 과정',
      opening: '가장 크게 변화/성장한 결과를 먼저 보여주세요.',
      structure: [
        '**[결론]** 성장의 결과 (Before → After)',
        '**[전환점]** 변화의 계기가 된 경험',
        '**[현재]** 성장이 현재 역량에 미친 영향',
      ],
      star: '상황: 성장 전 상태 → 행동: 변화를 위한 노력 → 결과: 달라진 점 → 배움: 성장의 의미',
      noExp: '학업 성적 향상, 대인관계 변화, 습관 개선 등 개인적 성장도 좋은 소재입니다.',
    },
    teamwork: {
      title: '협업 경험',
      opening: '팀에서 이룬 성과와 나의 기여를 먼저 밝히세요.',
      structure: [
        '**[결론]** 팀 성과와 나의 핵심 역할',
        '**[과정]** 협업 중 겪은 도전과 해결 방법',
        '**[배움]** 협업에서 배운 점',
      ],
      star: '상황: 팀 구성과 목표 → 행동: 나의 역할과 기여 → 결과: 팀 성과 → 배움: 협업 역량 성장',
      noExp: '조별 과제, 동아리 행사 준비, 아르바이트 팀워크도 훌륭한 협업 경험입니다.',
    },
    problem_solving: {
      title: '문제해결 경험',
      opening: '해결한 문제와 그 결과를 먼저 제시하세요.',
      structure: [
        '**[결론]** 해결한 문제와 임팩트',
        '**[분석]** 문제 인식과 원인 분석 과정',
        '**[해결]** 구체적 해결 전략과 실행',
      ],
      star: '상황: 문제 발생 배경 → 행동: 분석 및 해결 시도 → 결과: 문제 해결 성과 → 배움: 문제해결 역량 강화',
      noExp: '수강신청 전략 수립, 일정 관리 개선, 갈등 해결 등도 문제해결 소재입니다.',
    },
    custom: {
      title: '기타',
      opening: '핵심 메시지를 첫 문장에 두세요.',
      structure: ['자유롭게 작성하되, 두괄식 원칙을 지켜주세요.'],
      star: null,
      noExp: null,
    },
  };

  /**
   * 자동 섹션 매핑 추천
   */
  function suggestSection(branchText) {
    const text = branchText.toLowerCase();
    const patterns = [
      { key: 'motivation',      words: ['지원동기', '동기', '지원', '이유', '계기', '선택'] },
      { key: 'immersion',       words: ['몰입', '집중', '열정', '깊이', '도전'] },
      { key: 'capability',      words: ['역량 개발', '개발과정', '학습', '공부', '교육', '수강', '과정', '노력'] },
      { key: 'core_skill',      words: ['핵심 역량', '핵심', '기술', '스킬', '자격', '포트폴리오', '능력', '보유'] },
      { key: 'personality',     words: ['성격', '가치', '장점', '단점', '성향', '특성', '인성'] },
      { key: 'aspiration',      words: ['포부', '목표', '비전', '계획', '입사 후', '미래', '꿈'] },
      { key: 'growth',          words: ['성장', '변화', '발전', '배움', '전환'] },
      { key: 'teamwork',        words: ['협업', '팀', '팀워크', '소통', '커뮤니케이션', '조직'] },
      { key: 'problem_solving', words: ['문제', '해결', '극복', '위기', '갈등', '실패'] },
    ];

    let best = { key: 'custom', score: 0 };
    for (const p of patterns) {
      let score = 0;
      for (const w of p.words) {
        if (text.includes(w)) score += w.length;
      }
      if (score > best.score) best = { key: p.key, score };
    }
    return best.key;
  }

  /**
   * 노드 → 불릿 마크다운
   */
  function nodesToBullets(children, depth = 0) {
    if (!children || children.length === 0) return '';
    return children.map((c) => {
      const indent = '  '.repeat(depth);
      let line = `${indent}- ${c.text}`;
      if (c.children && c.children.length > 0) {
        line += '\n' + nodesToBullets(c.children, depth + 1);
      }
      return line;
    }).join('\n');
  }

  /**
   * 노드 → 두괄식 문단
   * 첫 번째 항목을 결론(Bold)으로, 나머지를 뒷받침으로 구성
   */
  function nodesToInvertedParagraph(children) {
    if (!children || children.length === 0) return '';
    const items = [];
    for (const c of children) {
      items.push(c.text);
      if (c.children) {
        for (const sub of c.children) items.push(sub.text);
      }
    }
    if (items.length === 0) return '';

    // 두괄식: 첫 문장을 결론으로 강조, 이후 2문장씩 문단 분리
    const lines = [`**${items[0]}.**`];
    const rest = items.slice(1);
    for (let i = 0; i < rest.length; i += 2) {
      const chunk = rest.slice(i, i + 2).map((s) =>
        s.endsWith('.') ? s : s + '.'
      );
      lines.push(chunk.join(' '));
    }
    return lines.join('\n\n');
  }

  /**
   * 섹션 콘텐츠 생성 (두괄식)
   */
  function generateSection(sectionKey, children, branchText) {
    const guide = GUIDES[sectionKey];
    if (!guide) return '';

    let md = `## ${guide.title}\n\n`;

    // 작성 가이드
    md += `> ${guide.opening}\n\n`;

    // 두괄식 초안
    if (children && children.length > 0) {
      md += nodesToInvertedParagraph(children) + '\n\n';
      md += '### 핵심 포인트\n\n';
      md += nodesToBullets(children) + '\n\n';
    } else {
      md += `*${branchText}에 대한 내용을 작성해주세요.*\n\n`;
    }

    // 두괄식 구조 안내
    md += '### 작성 구조 (두괄식)\n\n';
    for (const s of guide.structure) {
      md += `${s}\n\n`;
    }

    // STAR 기법 안내 (해당 섹션만)
    if (guide.star) {
      md += '### STAR 기법 적용\n\n';
      md += `> ${guide.star}\n\n`;
    }

    // 경험 부족 시 팁
    if (guide.noExp) {
      md += `*경험이 부족하다면:* ${guide.noExp}\n\n`;
    }

    return md;
  }

  /**
   * 전체 자기소개서 생성
   */
  function generate({ mappings, company, position, rootText }) {
    const date = new Date().toISOString().split('T')[0];
    let md = '';

    // 제목
    const parts = [company, position].filter(Boolean);
    md += parts.length > 0
      ? `# ${parts.join(' | ')} 자기소개서\n\n`
      : `# 자기소개서\n\n`;

    // 메타
    md += `> 작성일: ${date}`;
    if (company) md += ` | 회사: **${company}**`;
    if (position) md += ` | 직무: **${position}**`;
    md += '\n\n';

    md += '> **작성 원칙:** 두괄식(결론 먼저) + STAR 기법(상황-행동-결과-배움) + 진정성\n\n';
    md += '---\n\n';

    // 섹션 생성
    const active = mappings
      .filter((m) => m.sectionKey !== 'skip')
      .sort((a, b) => {
        const oa = SECTIONS.find((s) => s.key === a.sectionKey)?.order ?? 99;
        const ob = SECTIONS.find((s) => s.key === b.sectionKey)?.order ?? 99;
        return oa - ob;
      });

    for (const m of active) {
      md += generateSection(m.sectionKey, m.children, m.branchText);
      md += '---\n\n';
    }

    // 하단 안내
    md += `<!--\n`;
    md += `  Cover Letter Builder로 생성 | 원본: ${rootText}\n`;
    md += `  \n`;
    md += `  [편집 체크리스트]\n`;
    md += `  1. 각 섹션의 첫 문장이 결론(두괄식)인지 확인\n`;
    md += `  2. 구체적 수치/기간이 포함되어 있는지 확인\n`;
    md += `  3. 가이드 블록(> 로 시작)과 작성 구조 섹션은 완성 후 삭제\n`;
    md += `  4. 전체 문항이 하나의 일관된 스토리를 구성하는지 확인\n`;
    md += `-->\n`;

    return md;
  }

  return { SECTIONS, GUIDES, generate, suggestSection };
})();
