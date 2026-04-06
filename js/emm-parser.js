/**
 * EMM Parser - AlMind 마인드맵 파일(.emm) 파서
 *
 * AlMind EMM 파일은 XML 기반 마인드맵 포맷입니다.
 * FreeMind(.mm) 호환 포맷도 지원합니다.
 */

const EmmParser = (() => {
  /**
   * EMM/XML 텍스트를 파싱하여 마인드맵 트리 구조로 반환
   * @param {string} xmlText - EMM 파일의 XML 텍스트
   * @returns {{ root: MindMapNode }} 파싱된 마인드맵
   */
  function parse(xmlText) {
    idCounter = 0;
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error('유효하지 않은 EMM 파일 형식입니다.');
    }

    const rootEl = findRootNode(doc);
    if (!rootEl) {
      throw new Error('마인드맵 루트 노드를 찾을 수 없습니다.');
    }

    const root = parseNode(rootEl);
    return { root };
  }

  /**
   * XML 문서에서 루트 마인드맵 노드를 탐색
   * AlMind, FreeMind, XMind 등 다양한 포맷 지원
   */
  function findRootNode(doc) {
    // AlMind EMM 형식: <map><node ...>
    const mapNode = doc.querySelector('map > node');
    if (mapNode) return mapNode;

    // 직접 <node> 루트
    const directNode = doc.querySelector('node');
    if (directNode) return directNode;

    // AlMind 다른 변형: <Topic> 요소
    const topicNode = doc.querySelector('Topic');
    if (topicNode) return topicNode;

    // EMM 변형: <CentralTopic> 또는 <OrgChart>
    const central = doc.querySelector('CentralTopic, OrgChart');
    if (central) return central;

    return null;
  }

  /**
   * XML 요소를 재귀적으로 MindMapNode로 변환
   * @param {Element} el - XML 요소
   * @returns {MindMapNode}
   */
  function parseNode(el, depth = 0) {
    if (depth > 50) return { id: generateId(), text: '(max depth)', children: [] };
    const text = extractText(el);
    const children = [];

    // <node> 자식 탐색 (FreeMind/AlMind 공통)
    const childNodes = el.querySelectorAll(':scope > node');
    childNodes.forEach((child) => {
      children.push(parseNode(child, depth + 1));
    });

    // <Topic> 자식 탐색 (AlMind 변형)
    if (children.length === 0) {
      const topicChildren = el.querySelectorAll(':scope > Topic, :scope > SubTopic');
      topicChildren.forEach((child) => {
        children.push(parseNode(child, depth + 1));
      });
    }

    // <children> 래퍼가 있는 경우
    if (children.length === 0) {
      const childrenWrapper = el.querySelector(':scope > children');
      if (childrenWrapper) {
        const wrappedNodes = childrenWrapper.querySelectorAll(':scope > node, :scope > Topic');
        wrappedNodes.forEach((child) => {
          children.push(parseNode(child, depth + 1));
        });
      }
    }

    return {
      id: generateId(),
      text: text || '(제목 없음)',
      children,
    };
  }

  /**
   * 노드에서 텍스트를 추출
   * 여러 속성/자식 요소 패턴을 순차 탐색
   */
  function extractText(el) {
    // TEXT 속성 (FreeMind/AlMind 표준)
    const textAttr = el.getAttribute('TEXT') || el.getAttribute('text');
    if (textAttr) return textAttr.trim();

    // TITLE 속성
    const titleAttr = el.getAttribute('TITLE') || el.getAttribute('title');
    if (titleAttr) return titleAttr.trim();

    // NAME 속성
    const nameAttr = el.getAttribute('NAME') || el.getAttribute('name');
    if (nameAttr) return nameAttr.trim();

    // <richcontent> 자식에서 텍스트 추출
    const richContent = el.querySelector(':scope > richcontent');
    if (richContent) {
      const htmlContent = richContent.querySelector('html body, body');
      if (htmlContent) return htmlContent.textContent.trim();
      return richContent.textContent.trim();
    }

    // <title>, <text>, <name> 자식 요소
    for (const tag of ['title', 'text', 'name', 'label']) {
      const child = el.querySelector(`:scope > ${tag}`);
      if (child && child.textContent.trim()) {
        return child.textContent.trim();
      }
    }

    // 직접 텍스트 콘텐츠 (자식 요소 제외)
    const directText = getDirectTextContent(el);
    if (directText) return directText;

    return '';
  }

  /**
   * 요소의 직접 텍스트 노드만 추출 (자식 요소 텍스트 제외)
   */
  function getDirectTextContent(el) {
    let text = '';
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    return text.trim();
  }

  let idCounter = 0;
  function generateId() {
    return `node-${++idCounter}`;
  }

  /**
   * 파싱된 트리에서 1레벨 브랜치(루트 직계 자식) 추출
   * @param {{ root: MindMapNode }} tree
   * @returns {Array<{ id: string, text: string, children: MindMapNode[] }>}
   */
  function getBranches(tree) {
    return tree.root.children.map((child) => ({
      id: child.id,
      text: child.text,
      children: child.children,
    }));
  }

  /**
   * 노드와 자손의 모든 텍스트를 플랫 배열로 수집
   * @param {MindMapNode} node
   * @returns {string[]}
   */
  function collectTexts(node) {
    const texts = [node.text];
    for (const child of node.children) {
      texts.push(...collectTexts(child));
    }
    return texts;
  }

  /**
   * 노드를 구조적 텍스트로 변환 (들여쓰기 포함)
   * @param {MindMapNode} node
   * @param {number} depth
   * @returns {string}
   */
  function toOutline(node, depth = 0) {
    const indent = '  '.repeat(depth);
    const bullet = depth === 0 ? '' : '- ';
    let result = `${indent}${bullet}${node.text}\n`;
    for (const child of node.children) {
      result += toOutline(child, depth + 1);
    }
    return result;
  }

  /**
   * 데모 데이터 생성
   * @returns {{ root: MindMapNode }}
   */
  function createDemoData() {
    idCounter = 0;
    return {
      root: {
        id: generateId(),
        text: '자기소개서',
        children: [
          {
            id: generateId(),
            text: '지원동기',
            children: [
              { id: generateId(), text: '해당 분야에 대한 오랜 관심과 열정', children: [] },
              { id: generateId(), text: '대학교 관련 전공 수강 및 프로젝트 경험', children: [] },
              { id: generateId(), text: '산업의 성장성과 비전에 공감', children: [] },
              { id: generateId(), text: '기업의 가치관과 개인 목표의 일치', children: [] },
            ],
          },
          {
            id: generateId(),
            text: '몰입 경험',
            children: [
              { id: generateId(), text: '팀 프로젝트에서 핵심 기능 개발 담당', children: [] },
              { id: generateId(), text: '2주간 밤낮으로 문제 해결에 집중', children: [] },
              { id: generateId(), text: '최종 발표에서 우수상 수상', children: [] },
              { id: generateId(), text: '몰입을 통해 배운 끈기와 문제해결력', children: [] },
            ],
          },
          {
            id: generateId(),
            text: '역량 개발',
            children: [
              { id: generateId(), text: '관련 기술 독학 6개월 과정', children: [] },
              { id: generateId(), text: '온라인 강의 수료 (총 120시간)', children: [] },
              { id: generateId(), text: '개인 프로젝트 3건 완수', children: [] },
              { id: generateId(), text: '실패에서 배운 교훈과 개선 과정', children: [] },
            ],
          },
          {
            id: generateId(),
            text: '핵심 역량',
            children: [
              { id: generateId(), text: '프로그래밍: Python, JavaScript, SQL', children: [] },
              { id: generateId(), text: '자격증: 정보처리기사, SQLD', children: [] },
              { id: generateId(), text: '포트폴리오: 개인 웹서비스 운영 경험', children: [] },
              { id: generateId(), text: '협업: Git 활용 팀 프로젝트 5회', children: [] },
            ],
          },
          {
            id: generateId(),
            text: '성격 및 가치관',
            children: [
              { id: generateId(), text: '책임감: 맡은 일은 끝까지 완수', children: [] },
              { id: generateId(), text: '소통: 팀 내 의견 조율 경험', children: [] },
              { id: generateId(), text: '성장지향: 매일 1시간 자기개발', children: [] },
            ],
          },
          {
            id: generateId(),
            text: '입사 후 포부',
            children: [
              { id: generateId(), text: '1년차: 직무 역량 안정화 및 업무 숙달', children: [] },
              { id: generateId(), text: '3년차: 팀 내 핵심 인력으로 성장', children: [] },
              { id: generateId(), text: '5년차: 프로젝트 리드 역할 수행', children: [] },
            ],
          },
        ],
      },
    };
  }

  // Public API
  return {
    parse,
    getBranches,
    collectTexts,
    toOutline,
    createDemoData,
  };
})();
