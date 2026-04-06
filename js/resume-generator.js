/**
 * Resume Generator — 이력서 MD/HTML 생성 + AI 프롬프트
 */

const ResumeGenerator = (() => {
  const SECTIONS = [
    { key: 'personal',    label: '인적사항',   order: 1 },
    { key: 'education',   label: '학력',       order: 2 },
    { key: 'experience',  label: '경력',       order: 3 },
    { key: 'tech_stack',  label: '기술스택',   order: 4 },
    { key: 'project',     label: '프로젝트',   order: 5 },
    { key: 'certificate', label: '자격증',     order: 6 },
    { key: 'award',       label: '수상경력',   order: 7 },
    { key: 'military',    label: '병역사항',   order: 8 },
    { key: 'language',    label: '어학',       order: 9 },
    { key: 'activity',    label: '대외활동',   order: 10 },
    { key: 'intro',       label: '자기소개',   order: 11 },
    { key: 'custom',      label: '기타 (직접 작성)', order: 99 },
    { key: 'skip',        label: '(사용 안함)', order: -1 },
  ];

  const LAYOUTS = {
    classic: { name: '클래식', desc: '한국 표준 이력서 표 형식' },
    modern:  { name: '모던',   desc: '2컬럼 사이드바 레이아웃' },
    minimal: { name: '미니멀', desc: '1컬럼 타이포 중심' },
  };

  function suggestSection(branchText) {
    const text = branchText.toLowerCase();
    const patterns = [
      { key: 'personal',    words: ['인적', '이름', '연락', '성명', '개인정보'] },
      { key: 'education',   words: ['학력', '학교', '대학', '전공', '졸업', '학점'] },
      { key: 'experience',  words: ['경력', '경험', '근무', '회사', '직장', '인턴'] },
      { key: 'tech_stack',  words: ['기술', '스택', '프로그래밍', '언어', '프레임워크', '도구'] },
      { key: 'project',     words: ['프로젝트', '포트폴리오', '작품', '개발', '제작'] },
      { key: 'certificate', words: ['자격증', '자격', '면허', '시험', '합격'] },
      { key: 'award',       words: ['수상', '상', '대회', '공모', '우수'] },
      { key: 'military',    words: ['병역', '군', '복무', '전역', '면제'] },
      { key: 'language',    words: ['어학', '영어', '토익', '토플', '일본어', '외국어'] },
      { key: 'activity',    words: ['대외', '활동', '봉사', '동아리', '학회'] },
      { key: 'intro',       words: ['자기소개', '소개', '지원동기', '포부'] },
    ];
    let best = { key: 'custom', score: 0 };
    for (const p of patterns) {
      let score = 0;
      for (const w of p.words) { if (text.includes(w)) score += w.length; }
      if (score > best.score) best = { key: p.key, score };
    }
    return best.key;
  }

  function nodesToBullets(children) {
    if (!children || children.length === 0) return '';
    return children.map((c) => {
      let line = `- ${c.text}`;
      if (c.children && c.children.length > 0) {
        line += '\n' + c.children.map((s) => `  - ${s.text}`).join('\n');
      }
      return line;
    }).join('\n');
  }

  /**
   * 마크다운 이력서 생성
   */
  function generateMD({ mappings, formData, rootText }) {
    const date = new Date().toISOString().split('T')[0];
    let md = `# 이력서\n\n> 작성일: ${date}\n\n---\n\n`;

    // 인적사항 (폼 데이터)
    if (formData.name || formData.email) {
      md += `## 인적사항\n\n`;
      if (formData.name) md += `- **이름**: ${formData.name}\n`;
      if (formData.birth) md += `- **생년월일**: ${formData.birth}\n`;
      if (formData.phone) md += `- **연락처**: ${formData.phone}\n`;
      if (formData.email) md += `- **이메일**: ${formData.email}\n`;
      if (formData.address) md += `- **주소**: ${formData.address}\n`;
      md += '\n---\n\n';
    }

    // 학력 (복수)
    if (formData.educations?.length > 0) {
      md += `## 학력\n\n`;
      md += `| 학교 | 전공 | 기간 | 학점 |\n`;
      md += `|------|------|------|------|\n`;
      for (const e of formData.educations) {
        md += `| ${e.school || '-'} | ${e.major || '-'} | ${e.period || '-'} | ${e.gpa || '-'} |\n`;
      }
      md += '\n---\n\n';
    }

    // 경력 (복수)
    if (formData.experiences?.length > 0) {
      md += `## 경력\n\n`;
      md += `| 회사 | 직무 | 기간 | 성과 |\n`;
      md += `|------|------|------|------|\n`;
      for (const e of formData.experiences) {
        md += `| ${e.company || '-'} | ${e.role || '-'} | ${e.period || '-'} | ${e.desc || '-'} |\n`;
      }
      md += '\n---\n\n';
    }

    // 기술스택 (폼 데이터)
    if (formData.tech) {
      md += `## 기술스택\n\n`;
      const techs = formData.tech.split(',').map((t) => t.trim()).filter(Boolean);
      md += techs.map((t) => `\`${t}\``).join(' ') + '\n\n---\n\n';
    }

    // 자격증 (복수)
    if (formData.certificates?.length > 0) {
      md += `## 자격증\n\n`;
      for (const c of formData.certificates) {
        md += `- **${c.name || '-'}** (${c.date || '-'})\n`;
      }
      md += '\n---\n\n';
    }

    // 프로젝트 (복수)
    if (formData.projects?.length > 0) {
      md += `## 프로젝트\n\n`;
      for (const p of formData.projects) {
        md += `### ${p.name || '프로젝트'}\n`;
        if (p.period) md += `- **기간**: ${p.period}\n`;
        if (p.role) md += `- **역할**: ${p.role}\n`;
        if (p.desc) md += `- **성과**: ${p.desc}\n`;
        md += '\n';
      }
      md += '---\n\n';
    }

    // EMM 매핑 섹션
    const active = mappings
      .filter((m) => m.sectionKey !== 'skip' && m.sectionKey !== 'personal' && m.sectionKey !== 'education' && m.sectionKey !== 'tech_stack')
      .sort((a, b) => {
        const oa = SECTIONS.find((s) => s.key === a.sectionKey)?.order ?? 99;
        const ob = SECTIONS.find((s) => s.key === b.sectionKey)?.order ?? 99;
        return oa - ob;
      });

    for (const m of active) {
      const sec = SECTIONS.find((s) => s.key === m.sectionKey);
      const title = sec ? sec.label : m.branchText;
      md += `## ${title}\n\n`;
      if (m.children && m.children.length > 0) {
        md += nodesToBullets(m.children) + '\n\n';
      } else {
        md += `*${m.branchText}에 대한 내용을 작성해주세요.*\n\n`;
      }
      md += '---\n\n';
    }

    return md;
  }

  /**
   * HTML 이력서 생성
   */
  function generateHTML({ mappings, formData, rootText, layout }) {
    const active = mappings
      .filter((m) => m.sectionKey !== 'skip')
      .sort((a, b) => {
        const oa = SECTIONS.find((s) => s.key === a.sectionKey)?.order ?? 99;
        const ob = SECTIONS.find((s) => s.key === b.sectionKey)?.order ?? 99;
        return oa - ob;
      });

    const sectionsHTML = active.map((m) => {
      const sec = SECTIONS.find((s) => s.key === m.sectionKey);
      const title = sec ? sec.label : m.branchText;
      let content = '';
      if (m.children && m.children.length > 0) {
        content = '<ul>' + m.children.map((c) => {
          let li = `<li>${esc(c.text)}`;
          if (c.children && c.children.length > 0) {
            li += '<ul>' + c.children.map((s) => `<li>${esc(s.text)}</li>`).join('') + '</ul>';
          }
          return li + '</li>';
        }).join('') + '</ul>';
      }
      return { key: m.sectionKey, title, content };
    });

    const techTags = formData.tech
      ? formData.tech.split(',').map((t) => t.trim()).filter(Boolean).map((t) => `<span class="tag">${esc(t)}</span>`).join('')
      : '';

    if (layout === 'modern') return buildModernHTML(formData, sectionsHTML, techTags);
    if (layout === 'minimal') return buildMinimalHTML(formData, sectionsHTML, techTags);
    return buildClassicHTML(formData, sectionsHTML, techTags);
  }

  function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function wrapHTML(title, bodyHTML, extraCSS) {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Malgun Gothic','맑은 고딕',sans-serif;color:#1a1a2e;line-height:1.6;background:#fff}
@media print{body{background:#fff}@page{margin:15mm}}
${extraCSS}
</style>
</head>
<body>
${bodyHTML}
</body>
</html>`;
  }

  function buildClassicHTML(fd, sections, techTags) {
    let body = `<div class="resume">
<h1>${esc(fd.name || '이름')}</h1>
<table class="info-table"><tbody>
<tr><th>생년월일</th><td>${esc(fd.birth || '-')}</td><th>연락처</th><td>${esc(fd.phone || '-')}</td></tr>
<tr><th>이메일</th><td>${esc(fd.email || '-')}</td><th>주소</th><td>${esc(fd.address || '-')}</td></tr>
</tbody></table>`;
    if (fd.educations?.length > 0) {
      body += `<h2>학력</h2><table class="data-table"><thead><tr><th>학교</th><th>전공</th><th>기간</th><th>학점</th></tr></thead><tbody>`;
      for (const e of fd.educations) body += `<tr><td>${esc(e.school||'-')}</td><td>${esc(e.major||'-')}</td><td>${esc(e.period||'-')}</td><td>${esc(e.gpa||'-')}</td></tr>`;
      body += '</tbody></table>';
    }
    if (fd.experiences?.length > 0) {
      body += `<h2>경력</h2><table class="data-table"><thead><tr><th>회사</th><th>직무</th><th>기간</th><th>성과</th></tr></thead><tbody>`;
      for (const e of fd.experiences) body += `<tr><td>${esc(e.company||'-')}</td><td>${esc(e.role||'-')}</td><td>${esc(e.period||'-')}</td><td>${esc(e.desc||'-')}</td></tr>`;
      body += '</tbody></table>';
    }
    if (techTags) body += `<h2>기술스택</h2><div class="tags">${techTags}</div>`;
    if (fd.certificates?.length > 0) {
      body += '<h2>자격증</h2><ul>';
      for (const c of fd.certificates) body += `<li><strong>${esc(c.name||'-')}</strong> (${esc(c.date||'-')})</li>`;
      body += '</ul>';
    }
    if (fd.projects?.length > 0) {
      body += '<h2>프로젝트</h2>';
      for (const p of fd.projects) {
        body += `<div class="project"><h3>${esc(p.name||'프로젝트')}</h3>`;
        if (p.period) body += `<p>기간: ${esc(p.period)}</p>`;
        if (p.role) body += `<p>역할: ${esc(p.role)}</p>`;
        if (p.desc) body += `<p>성과: ${esc(p.desc)}</p>`;
        body += '</div>';
      }
    }
    for (const s of sections) {
      if (['personal','education','tech_stack'].includes(s.key)) continue;
      body += `<h2>${esc(s.title)}</h2>${s.content || '<p>-</p>'}`;
    }
    body += '</div>';
    const css = `.resume{max-width:800px;margin:0 auto;padding:2rem}
h1{font-size:1.6rem;text-align:center;margin-bottom:1.5rem;border-bottom:2px solid #1a1a2e;padding-bottom:.5rem}
h2{font-size:1rem;margin:1.5rem 0 .5rem;padding:.3rem .6rem;background:#f5f3ff;border-left:4px solid #7c3aed;color:#7c3aed}
table{width:100%;border-collapse:collapse;margin-bottom:1rem}
.info-table th{width:15%;background:#fafafa;padding:.4rem .6rem;border:1px solid #e5e7eb;font-size:.85rem}
.info-table td{padding:.4rem .6rem;border:1px solid #e5e7eb;font-size:.85rem}
.data-table th{background:#fafafa;padding:.4rem .6rem;border:1px solid #e5e7eb;font-size:.82rem;text-align:center}
.data-table td{padding:.4rem .6rem;border:1px solid #e5e7eb;font-size:.82rem;text-align:center}
ul{padding-left:1.5rem;margin:.5rem 0}li{margin-bottom:.3rem;font-size:.85rem}
.tags{display:flex;flex-wrap:wrap;gap:.4rem;margin:.5rem 0}
.tag{padding:.2rem .6rem;background:#ede9fe;color:#7c3aed;border-radius:4px;font-size:.78rem;font-weight:500}`;
    return wrapHTML('이력서 - ' + (fd.name || ''), body, css);
  }

  function buildModernHTML(fd, sections, techTags) {
    let sidebar = `<div class="sidebar">
<h1>${esc(fd.name || '이름')}</h1>
<div class="contact">`;
    if (fd.birth) sidebar += `<p>${esc(fd.birth)}</p>`;
    if (fd.phone) sidebar += `<p>${esc(fd.phone)}</p>`;
    if (fd.email) sidebar += `<p>${esc(fd.email)}</p>`;
    if (fd.address) sidebar += `<p>${esc(fd.address)}</p>`;
    sidebar += '</div>';
    if (techTags) sidebar += `<h2>기술스택</h2><div class="tags">${techTags}</div>`;
    const sideKeys = ['certificate', 'language', 'military'];
    for (const s of sections) {
      if (sideKeys.includes(s.key)) {
        sidebar += `<h2>${esc(s.title)}</h2>${s.content || ''}`;
      }
    }
    sidebar += '</div>';

    let main = '<div class="main-col">';
    if (fd.educations?.length > 0) {
      main += '<h2>학력</h2>';
      for (const e of fd.educations) main += `<p><strong>${esc(e.school||'')}</strong> ${esc(e.major||'')} (${esc(e.period||'')}) ${e.gpa ? 'GPA: '+esc(e.gpa) : ''}</p>`;
    }
    if (fd.experiences?.length > 0) {
      main += '<h2>경력</h2>';
      for (const e of fd.experiences) main += `<p><strong>${esc(e.company||'')}</strong> ${esc(e.role||'')} (${esc(e.period||'')})${e.desc ? ' &mdash; '+esc(e.desc) : ''}</p>`;
    }
    if (fd.projects?.length > 0) {
      main += '<h2>프로젝트</h2>';
      for (const p of fd.projects) main += `<p><strong>${esc(p.name||'')}</strong> (${esc(p.period||'')}) ${esc(p.role||'')}${p.desc ? ' &mdash; '+esc(p.desc) : ''}</p>`;
    }
    for (const s of sections) {
      if (['personal','education','tech_stack',...sideKeys].includes(s.key)) continue;
      main += `<h2>${esc(s.title)}</h2>${s.content || '<p>-</p>'}`;
    }
    main += '</div>';

    const body = `<div class="resume">${sidebar}${main}</div>`;
    const css = `.resume{display:flex;max-width:900px;margin:0 auto;min-height:100vh}
.sidebar{width:280px;background:#1e1b4b;color:#fff;padding:2rem 1.5rem;flex-shrink:0}
.sidebar h1{font-size:1.3rem;margin-bottom:1rem;border-bottom:1px solid rgba(255,255,255,.2);padding-bottom:.5rem}
.sidebar h2{font-size:.85rem;margin:1.2rem 0 .4rem;text-transform:uppercase;letter-spacing:.05em;opacity:.7}
.sidebar p{font-size:.82rem;margin-bottom:.2rem;opacity:.9}
.sidebar ul{padding-left:1.2rem;margin:.3rem 0}.sidebar li{font-size:.8rem;margin-bottom:.2rem;opacity:.9}
.contact{margin-bottom:1rem}
.main-col{flex:1;padding:2rem}
.main-col h2{font-size:1rem;margin:1.5rem 0 .5rem;color:#7c3aed;border-bottom:2px solid #ede9fe;padding-bottom:.3rem}
.main-col p{font-size:.85rem;margin-bottom:.4rem}
.main-col ul{padding-left:1.5rem;margin:.5rem 0}.main-col li{font-size:.85rem;margin-bottom:.3rem}
.tags{display:flex;flex-wrap:wrap;gap:.3rem;margin:.4rem 0}
.tag{padding:.15rem .5rem;background:rgba(255,255,255,.15);color:#fff;border-radius:3px;font-size:.72rem}`;
    return wrapHTML('이력서 - ' + (fd.name || ''), body, css);
  }

  function buildMinimalHTML(fd, sections, techTags) {
    let body = `<div class="resume">
<header>
<h1>${esc(fd.name || '이름')}</h1>
<p class="meta">`;
    const meta = [fd.birth, fd.phone, fd.email, fd.address].filter(Boolean).map(esc);
    body += meta.join(' &middot; ');
    body += '</p></header>';
    if (fd.educations?.length > 0) {
      body += '<section><h2>학력</h2>';
      for (const e of fd.educations) body += `<p><strong>${esc(e.school||'')}</strong> ${esc(e.major||'')} &middot; ${esc(e.period||'')} ${e.gpa ? '&middot; GPA '+esc(e.gpa) : ''}</p>`;
      body += '</section>';
    }
    if (fd.experiences?.length > 0) {
      body += '<section><h2>경력</h2>';
      for (const e of fd.experiences) body += `<p><strong>${esc(e.company||'')}</strong> ${esc(e.role||'')} &middot; ${esc(e.period||'')}${e.desc ? ' &middot; '+esc(e.desc) : ''}</p>`;
      body += '</section>';
    }
    if (techTags) body += `<section><h2>기술스택</h2><div class="tags">${techTags}</div></section>`;
    for (const s of sections) {
      if (['personal','education','tech_stack'].includes(s.key)) continue;
      body += `<section><h2>${esc(s.title)}</h2>${s.content || '<p>-</p>'}</section>`;
    }
    body += '</div>';
    const css = `.resume{max-width:700px;margin:0 auto;padding:3rem 2rem}
header{text-align:center;margin-bottom:2rem}
h1{font-size:1.8rem;font-weight:800;letter-spacing:-.03em}
.meta{color:#6b7280;font-size:.82rem;margin-top:.3rem}
section{margin-bottom:1.5rem}
h2{font-size:.9rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#7c3aed;margin-bottom:.5rem;padding-bottom:.3rem;border-bottom:1px solid #e5e7eb}
p{font-size:.85rem;margin-bottom:.3rem}
ul{padding-left:1.3rem;margin:.4rem 0}li{font-size:.85rem;margin-bottom:.2rem}
.tags{display:flex;flex-wrap:wrap;gap:.4rem}
.tag{padding:.2rem .6rem;background:#f5f3ff;color:#7c3aed;border-radius:99px;font-size:.75rem;font-weight:500}`;
    return wrapHTML('이력서 - ' + (fd.name || ''), body, css);
  }

  /**
   * AI 이력서 프롬프트
   */
  function buildAIPrompt({ mappings, formData, rootText }) {
    const active = mappings.filter((m) => m.sectionKey !== 'skip');
    let prompt = `당신은 한국 취업 시장에 특화된 이력서 작성 전문가입니다.
아래 데이터를 기반으로 깔끔하고 전문적인 이력서를 마크다운으로 작성하세요.

## 작성 원칙
- 간결하고 팩트 중심 (서술형 X, 불릿 포인트 중심)
- 성과는 수치화 (기간, 인원, 결과)
- 기술스택은 코드 블록(\`)으로 감싸기
- 학력/경력은 표(table) 형식

## 인적사항 (직접 입력)
`;
    if (formData.name) prompt += `- 이름: ${formData.name}\n`;
    if (formData.birth) prompt += `- 생년월일: ${formData.birth}\n`;
    if (formData.phone) prompt += `- 연락처: ${formData.phone}\n`;
    if (formData.email) prompt += `- 이메일: ${formData.email}\n`;
    if (formData.address) prompt += `- 주소: ${formData.address}\n`;
    if (formData.educations?.length > 0) {
      prompt += `\n## 학력\n`;
      for (const e of formData.educations) prompt += `- ${e.school||''} / ${e.major||''} / ${e.period||''} / ${e.gpa||''}\n`;
    }
    if (formData.experiences?.length > 0) {
      prompt += `\n## 경력\n`;
      for (const e of formData.experiences) prompt += `- ${e.company||''} / ${e.role||''} / ${e.period||''} / ${e.desc||''}\n`;
    }
    if (formData.tech) prompt += `\n## 기술스택\n${formData.tech}\n`;
    if (formData.certificates?.length > 0) {
      prompt += `\n## 자격증\n`;
      for (const c of formData.certificates) prompt += `- ${c.name||''} (${c.date||''})\n`;
    }
    if (formData.projects?.length > 0) {
      prompt += `\n## 프로젝트\n`;
      for (const p of formData.projects) prompt += `- ${p.name||''} / ${p.period||''} / ${p.role||''} / ${p.desc||''}\n`;
    }

    prompt += `\n## EMM 마인드맵 데이터\n\n`;
    for (const m of active) {
      const sec = SECTIONS.find((s) => s.key === m.sectionKey);
      prompt += `### ${sec ? sec.label : m.branchText}\n`;
      if (m.children && m.children.length > 0) {
        const safe = (s) => s.replace(/[\r\n]/g, ' ').substring(0, 500);
        for (const c of m.children) {
          prompt += `- ${safe(c.text)}\n`;
          if (c.children) { for (const s of c.children) prompt += `  - ${safe(s.text)}\n`; }
        }
      }
      prompt += '\n';
    }

    prompt += `\n## 출력 형식
- 마크다운 형식, 코드블록으로 감싸지 말 것
- # 이력서 제목, ## 섹션명
- 인적사항은 불릿 리스트
- 학력/경력은 표(table)
- 기술스택은 인라인 코드(\`)
- 프로젝트는 이름/기간/역할/성과 구조
- 간결하게, 한 항목당 1~2줄`;

    return prompt;
  }

  /**
   * AI 레이아웃 추천 프롬프트
   */
  function buildLayoutPrompt({ mappings, formData }) {
    const sectionKeys = mappings.filter((m) => m.sectionKey !== 'skip').map((m) => m.sectionKey);
    const hasExperience = sectionKeys.includes('experience');
    const hasProject = sectionKeys.includes('project');
    const hasTech = Boolean(formData.tech);

    let prompt = `이력서 데이터를 분석하여 최적 레이아웃을 추천하세요.

데이터:
- 섹션: ${sectionKeys.join(', ')}
- 경력 유무: ${hasExperience ? '있음' : '없음'}
- 프로젝트 유무: ${hasProject ? '있음' : '없음'}
- 기술스택 유무: ${hasTech ? '있음' : '없음'}

선택지: classic(한국 표준 표 형식), modern(2컬럼 사이드바), minimal(1컬럼 타이포)

반드시 다음 JSON만 출력하세요 (다른 텍스트 없이):
{"layout":"classic|modern|minimal","reason":"한줄 이유"}`;

    return prompt;
  }

  return {
    SECTIONS, LAYOUTS,
    suggestSection, generateMD, generateHTML,
    buildAIPrompt, buildLayoutPrompt,
  };
})();
